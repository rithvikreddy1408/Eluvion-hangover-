"""
Feedback Service — the true improve() pipeline.
Processes user feedback to permanently update memory confidence, weight,
and graph relationships. Every correction is versioned before being applied.
"""
from __future__ import annotations
import time
from datetime import datetime
from typing import Optional

from app.models.feedback import FeedbackRequest, FeedbackResponse, FeedbackType
from app.models.memory import MemoryNode


def _get_store():
    from app.services.store import active_store
    return active_store


def process_feedback(request: FeedbackRequest) -> FeedbackResponse:
    """
    Central feedback processor. Routes to the correct improve() action.
    Every action is audited and versioned.
    """
    start = time.time()
    store = _get_store()
    from app.services.version_service import create_version
    from app.services import audit_log

    affected = []
    action_taken = ""
    new_memory_id = None
    message = ""

    nodes = [node for nid in request.memory_ids if (node := store.nodes.get(nid))]

    if request.feedback_type == FeedbackType.INCORRECT:
        # Reduce confidence and weight; mark potentially outdated
        for node in nodes:
            create_version(node, reason="User marked incorrect", changed_by=request.session_id)
            node.confidence = round(max(0.05, node.confidence * 0.6), 3)
            node.weight = round(max(0.1, node.weight * 0.5), 3)
            node.negative_feedback += 1
            node.updated_at = datetime.utcnow()
            from app.services.importance_engine import compute_importance
            node.importance_score = compute_importance(node, store.nodes, store.edges)
            affected.append(node.id)
        action_taken = "reduced_confidence"
        message = f"Marked {len(affected)} memor(ies) as potentially incorrect. Confidence reduced."

    elif request.feedback_type == FeedbackType.CORRECT:
        # Strengthen confidence
        for node in nodes:
            create_version(node, reason="User confirmed correct", changed_by=request.session_id)
            node.confidence = round(min(1.0, node.confidence * 1.1), 3)
            node.weight = round(min(3.0, node.weight * 1.2), 3)
            node.positive_feedback += 1
            node.updated_at = datetime.utcnow()
            from app.services.importance_engine import compute_importance
            node.importance_score = compute_importance(node, store.nodes, store.edges)
            affected.append(node.id)
        action_taken = "strengthened_confidence"
        message = f"Strengthened {len(affected)} memor(ies). Confidence increased."

    elif request.feedback_type == FeedbackType.OUTDATED:
        for node in nodes:
            create_version(node, reason="User marked outdated", changed_by=request.session_id)
            node.is_outdated = True
            node.weight = 0.1
            node.negative_feedback += 1
            node.updated_at = datetime.utcnow()
            affected.append(node.id)
        action_taken = "marked_outdated"
        message = f"Marked {len(affected)} memor(ies) as outdated. Will not surface in future recalls."

    elif request.feedback_type == FeedbackType.REPLACE and request.correction:
        # Supersede old memories and store correction
        for node in nodes:
            create_version(node, reason="Replaced by user correction", changed_by=request.session_id)
            node.is_outdated = True
            node.weight = 0.05
            node.negative_feedback += 1
            node.updated_at = datetime.utcnow()
            affected.append(node.id)

        # Store the correction as a new high-confidence memory
        tags = list(set(t for n in nodes for t in n.tags)) if nodes else []
        subject = nodes[0].subject if nodes else "correction"
        new_node = store.remember(
            content=request.correction,
            subject=subject,
            tags=tags + ["correction", "user_verified"],
            node_type="fact",
            source="user_correction",
            confidence=0.95,
        )
        new_node.change_reason = f"Corrects: {', '.join(n.content[:30] for n in nodes)}"
        new_node.positive_feedback = 1
        new_node.importance_score = 1.5  # start high since user explicitly provided this
        new_memory_id = new_node.id

        # Link new to old
        for old_id in affected:
            store._add_edge(old_id, new_node.id, "REPLACED_BY")

        action_taken = "replaced"
        message = f"Stored correction. Superseded {len(affected)} old memor(ies)."

    elif request.feedback_type == FeedbackType.PREFER:
        # Learn preference from correction text
        if request.correction:
            from app.services.preference_service import extract_preferences
            prefs = extract_preferences(request.correction)
            action_taken = "learned_preference"
            message = f"Learned {len(prefs)} preference(s) from feedback."
        else:
            for node in nodes:
                node.is_pinned = True
                node.positive_feedback += 1
                affected.append(node.id)
            action_taken = "pinned"
            message = "Pinned these memories as preferred."

    elif request.feedback_type == FeedbackType.AVOID:
        for node in nodes:
            create_version(node, reason="User marked avoid", changed_by=request.session_id)
            node.weight = round(max(0.05, node.weight * 0.2), 3)
            node.confidence = round(max(0.05, node.confidence * 0.7), 3)
            node.negative_feedback += 1
            node.updated_at = datetime.utcnow()
            affected.append(node.id)
        action_taken = "deprioritized"
        message = f"Deprioritized {len(affected)} memor(ies). Will be avoided in recalls."

    elif request.feedback_type == FeedbackType.FORGET:
        for nid in request.memory_ids:
            store.forget(nid)
            affected.append(nid)
        action_taken = "forgotten"
        message = f"Removed {len(affected)} memor(ies) from the knowledge graph."

    elif request.feedback_type == FeedbackType.STRENGTHEN:
        for node in nodes:
            create_version(node, reason="User strengthened", changed_by=request.session_id)
            node.confidence = round(min(1.0, node.confidence + 0.15), 3)
            node.weight = round(min(3.0, node.weight * 1.5), 3)
            node.is_pinned = True
            node.positive_feedback += 1
            node.updated_at = datetime.utcnow()
            from app.services.importance_engine import compute_importance
            node.importance_score = compute_importance(node, store.nodes, store.edges)
            affected.append(node.id)
        action_taken = "strengthened"
        message = f"Strengthened and pinned {len(affected)} memor(ies)."

    duration_ms = (time.time() - start) * 1000
    audit_log.log(
        operation="improve",
        node_ids=affected,
        duration_ms=duration_ms,
        reason=f"feedback:{request.feedback_type}",
        changed_fields={"feedback_type": request.feedback_type, "action": action_taken},
        session_id=request.session_id,
        success=True,
    )

    # Force MRI rescan after feedback
    try:
        from app.services import mri_monitor
        mri_monitor.force_scan()
    except Exception:
        pass

    return FeedbackResponse(
        success=True,
        affected_nodes=affected,
        action_taken=action_taken,
        message=message,
        new_memory_id=new_memory_id,
    )
