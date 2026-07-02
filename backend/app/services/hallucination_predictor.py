"""
Hallucination Predictor — scores retrieved memory context before LLM inference.
High risk = low confidence memories, stale data, or gaps in coverage.
"""
from __future__ import annotations
import re
from typing import List

from app.models.memory import MemoryNode
from app.models.prediction import PredictionReport, PredictionSignals


def predict(memories: List[MemoryNode], query: str) -> PredictionReport:
    if not memories:
        return PredictionReport(
            risk_level="high",
            score=0.90,
            signals=PredictionSignals(
                low_confidence_ratio=1.0,
                staleness_ratio=0.0,
                coverage_gap=1.0,
                no_memories=True,
            ),
            recommendation="No memories retrieved. Response relies entirely on base LLM knowledge — verify claims.",
            memory_count=0,
        )

    # Signal 1: fraction of nodes with confidence below threshold
    low_conf = sum(1 for m in memories if m.confidence < 0.5)
    low_confidence_ratio = round(low_conf / len(memories), 3)

    # Signal 2: fraction of stale/outdated nodes
    stale = sum(1 for m in memories if m.is_outdated)
    staleness_ratio = round(stale / len(memories), 3)

    # Signal 3: query term coverage gap
    query_terms = set(re.findall(r'\b\w{4,}\b', query.lower()))
    covered = set()
    for m in memories:
        covered |= set(re.findall(r'\b\w{4,}\b', m.content.lower()))
        covered |= set(re.findall(r'\b\w{4,}\b', ' '.join(m.tags).lower()))
    coverage_gap = round(len(query_terms - covered) / len(query_terms), 3) if query_terms else 0.0

    # Composite risk score
    score = round(
        0.35 * low_confidence_ratio +
        0.30 * staleness_ratio +
        0.35 * coverage_gap,
        3,
    )

    if score < 0.20:
        risk_level = "low"
        recommendation = "Memory context is strong. Response should be well-grounded."
    elif score < 0.50:
        risk_level = "medium"
        recommendation = "Some memories are uncertain. AI may hedge claims — this is correct behaviour."
    else:
        risk_level = "high"
        recommendation = "Weak or stale memory context. High hallucination risk — consider adding memories."

    return PredictionReport(
        risk_level=risk_level,
        score=score,
        signals=PredictionSignals(
            low_confidence_ratio=low_confidence_ratio,
            staleness_ratio=staleness_ratio,
            coverage_gap=coverage_gap,
            no_memories=False,
        ),
        recommendation=recommendation,
        memory_count=len(memories),
    )
