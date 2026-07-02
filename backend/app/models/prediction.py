from pydantic import BaseModel


class PredictionSignals(BaseModel):
    low_confidence_ratio: float
    staleness_ratio: float
    coverage_gap: float
    no_memories: bool


class PredictionReport(BaseModel):
    risk_level: str          # low | medium | high
    score: float             # 0.0 - 1.0
    signals: PredictionSignals
    recommendation: str
    memory_count: int
