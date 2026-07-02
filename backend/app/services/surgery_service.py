"""
Surgery Service — plan, simulate, execute, and rollback memory repairs.
Repair is never immediate: always Plan → Simulate → Execute → Verify.
"""
from __future__ import annotations
from typing import Dict, List, Optional, Any

from app.models.surgery import (
    RepairPlan, RepairOperation, RepairSimulation,
    DiffEntry, RepairSnapshot, SurgeryResult,
)
from app.models.diagnosis import MemoryDisease

# In-process stores — acceptable for hackathon
_plans: Dict[str, RepairPlan] = {}
_snapshots: Dict[str, RepairSnapshot] = {}


# ── Public API ────────────────────────────────────────────────────────────────

def plan_surgery(disease: MemoryDisease) -> RepairPlan:
    operations: List[RepairOperation] = []
    for nid in disease.affected_node_ids:
        for action in disease.repair_actions[:1]:  # one primary action per node
            op_type = _action_to_op(action)
            operations.append(RepairOperation(
                op_type=op_type,
                node_id=nid,
                description=_describe_op(op_type, nid),
            ))

    plan = RepairPlan(
        disease_id=disease.id,
        disease_type=disease.type,
        operations=operations,
        estimated_improvement=_estimate_improvement(disease),
        risk_level="low" if disease.severity < 0.5 else "medium" if disease.severity < 0.8 else "high",
    )
    _plans[plan.plan_id] = plan
    return plan


def simulate_surgery(plan_id: str) -> Optional[RepairSimulation]:
    plan = _plans.get(plan_id)
    if not plan:
        return None

    from app.services.store import active_store

    diff: List[DiffEntry] = []
    risks: List[str] = []

    for op in plan.operations:
        node = active_store.nodes.get(op.node_id)
        if not node:
            risks.append(f"Node {op.node_id[:8]}… not found — may already be deleted")
            continue

        # Record before_state for rollback reference
        op.before_state = {
            "content": node.content,
            "confidence": node.confidence,
            "weight": node.weight,
            "is_outdated": node.is_outdated,
        }

        if op.op_type == "forget":
            diff.append(DiffEntry(
                node_id=op.node_id, change_type="removed", field="node",
                before=node.content[:80], after="<deleted>",
            ))
            connected = [e for e in active_store.edges
                         if e.source == op.node_id or e.target == op.node_id]
            if len(connected) > 2:
                risks.append(f"Removing node '{node.content[:40]}…' will orphan {len(connected)} edges")

        elif op.op_type == "boost":
            after_weight = round(min(3.0, node.weight * 2.0), 2)
            diff.append(DiffEntry(
                node_id=op.node_id, change_type="modified", field="weight",
                before=node.weight, after=after_weight,
            ))

        elif op.op_type == "normalize":
            diff.append(DiffEntry(
                node_id=op.node_id, change_type="modified", field="weight",
                before=node.weight, after=1.0,
            ))
            diff.append(DiffEntry(
                node_id=op.node_id, change_type="modified", field="retrieval_count",
                before=node.retrieval_count, after=max(0, node.retrieval_count // 2),
            ))

        elif op.op_type == "mark_outdated":
            diff.append(DiffEntry(
                node_id=op.node_id, change_type="modified", field="is_outdated",
                before=node.is_outdated, after=True,
            ))

        elif op.op_type == "reconnect":
            diff.append(DiffEntry(
                node_id=op.node_id, change_type="added", field="edge",
                before=None, after="related_to",
            ))

    predicted_change = _estimate_score_change(plan.disease_type, len(diff), len(risks))

    return RepairSimulation(
        plan_id=plan_id,
        diff=diff,
        predicted_score_change=predicted_change,
        risks=risks,
        safe_to_execute=len(risks) == 0 or plan.risk_level != "high",
    )


def execute_surgery(plan_id: str) -> Optional[SurgeryResult]:
    plan = _plans.get(plan_id)
    if not plan:
        return None

    from app.services.store import active_store
    from app.services.health_engine import compute_health
    from app.services.pathology_engine import run_diagnosis

    # Snapshot BEFORE touching anything
    nodes_snap = {k: v.model_dump() for k, v in active_store.nodes.items()}
    edges_snap = [e.model_dump() for e in active_store.edges]
    diag = run_diagnosis(active_store.nodes, active_store.edges, active_store.retrieval_log)
    health_before = compute_health(active_store.nodes, active_store.edges, diag.diseases).overall_score

    snapshot = RepairSnapshot(
        plan_id=plan_id,
        nodes_snapshot=nodes_snap,
        edges_snapshot=edges_snap,
        health_before=health_before,
    )
    _snapshots[snapshot.snapshot_id] = snapshot

    # Execute operations
    action_map = {
        "forget": "forget_nodes",
        "boost": "boost_nodes",
        "normalize": "normalize",
        "reconnect": "reconnect",
        "mark_outdated": "mark_outdated",
    }

    applied = 0
    for op in plan.operations:
        node = active_store.nodes.get(op.node_id)
        if not node:
            continue
        try:
            action = action_map.get(op.op_type, "boost_nodes")
            single = MemoryDisease(
                id=plan.disease_id,
                type=plan.disease_type,
                severity=0.5, confidence=0.8,
                affected_node_ids=[op.node_id],
                description="", suggestion="",
                repair_actions=[action],
            )
            from app.services.repair_engine import apply_repair
            apply_repair(single, active_store, action)
            applied += 1
        except Exception as e:
            print(f"[surgery] op {op.op_type} failed: {e}")

    # Force MRI rescan after surgery
    from app.services import mri_monitor
    health_after_report, _ = mri_monitor.force_scan()

    return SurgeryResult(
        success=True,
        plan_id=plan_id,
        snapshot_id=snapshot.snapshot_id,
        operations_applied=applied,
        message=f"Applied {applied}/{len(plan.operations)} operations. Health: {health_before:.0f} → {health_after_report.overall_score:.0f}",
        health_before=health_before,
        health_after=health_after_report.overall_score,
    )


def rollback_surgery(snapshot_id: str) -> bool:
    snapshot = _snapshots.get(snapshot_id)
    if not snapshot:
        return False

    from app.services.store import active_store
    from app.models.memory import MemoryNode, MemoryEdge

    active_store.nodes = {k: MemoryNode(**v) for k, v in snapshot.nodes_snapshot.items()}
    active_store.edges = [MemoryEdge(**e) for e in snapshot.edges_snapshot]

    from app.services import mri_monitor
    mri_monitor.force_scan()
    return True


def get_plans() -> List[RepairPlan]:
    return list(_plans.values())


def get_plan(plan_id: str) -> Optional[RepairPlan]:
    return _plans.get(plan_id)


def get_snapshot(snapshot_id: str) -> Optional[RepairSnapshot]:
    return _snapshots.get(snapshot_id)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _action_to_op(action: str) -> str:
    return {
        "forget_nodes": "forget",
        "boost_nodes": "boost",
        "reconnect": "reconnect",
        "disconnect_edge": "mark_outdated",
        "mark_outdated": "mark_outdated",
        "normalize": "normalize",
        "apply_suggested": "boost",
    }.get(action, "boost")


def _describe_op(op_type: str, node_id: str) -> str:
    short = node_id[:8]
    return {
        "forget": f"Remove node {short}… from memory graph",
        "boost": f"Increase retrieval weight for node {short}…",
        "normalize": f"Reset retrieval bias on node {short}…",
        "reconnect": f"Add relationship edge for node {short}…",
        "mark_outdated": f"Flag node {short}… as outdated",
    }.get(op_type, f"Repair node {short}…")


def _estimate_improvement(disease: MemoryDisease) -> float:
    base = {
        "memory_rot": 7.0, "contamination": 9.0, "fragmentation": 4.0,
        "amnesia": 3.0, "bias": 5.0, "noise": 4.0,
    }.get(disease.type, 4.0)
    return round(base * disease.severity, 1)


def _estimate_score_change(disease_type: str, diff_count: int, risk_count: int) -> float:
    base = {
        "memory_rot": 7.0, "contamination": 9.0, "fragmentation": 4.0,
        "amnesia": 3.0, "bias": 5.0, "noise": 4.0,
    }.get(disease_type, 4.0)
    penalty = risk_count * 1.5
    return round(max(0.0, base - penalty), 1)
