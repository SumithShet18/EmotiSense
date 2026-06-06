from pydantic import BaseModel
from typing import Optional


class PredictResponse(BaseModel):
    id: str | int
    transcript: Optional[str] = None
    emotion: str
    confidence: float
    probabilities: dict[str, float]


class HealthResponse(BaseModel):
    status: str = "running"


class HistoryItem(BaseModel):
    id: str | int
    timestamp: str
    text_input: Optional[str] = None
    audio_path: Optional[str] = None
    audio_url: Optional[str] = None
    emotion: str
    confidence: float
    probabilities: Optional[dict] = None


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    total: int
