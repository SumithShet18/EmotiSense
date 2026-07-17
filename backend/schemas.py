from pydantic import BaseModel
from typing import Optional


class PredictResponse(BaseModel):
    id: str | int
    transcript: Optional[str] = None
    emotion: str
    confidence: float
    probabilities: dict[str, float]
    transcription_warning: Optional[str] = None
    performance: Optional[PerformanceSummary] = None
    inline_explanation: Optional[dict] = None


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


class StageMetrics(BaseModel):
    component: str
    latency_ms: float
    cpu_usage: float
    memory_mb: float
    energy_joules: float


class PerformanceSummary(BaseModel):
    stages: list[StageMetrics]
    total_latency_ms: float
    total_energy_joules: float
    peak_memory_mb: float
    avg_cpu_usage: float
    throughput_inferences_per_sec: float


class PerformanceLog(BaseModel):
    id: int
    timestamp: str
    prediction_id: int | str
    component: str
    latency_ms: float
    memory_mb: float
    cpu_usage: float
    energy_joules: float


class PerformanceLogsResponse(BaseModel):
    items: list[PerformanceLog]


class FullResultResponse(BaseModel):
    prediction_id: str | int
    emotion: str
    confidence: float
    probabilities: dict[str, float]
    transcript: Optional[str] = None
    text_input: Optional[str] = None
    audio_url: Optional[str] = None
    timestamp: Optional[str] = None
    transcription_warning: Optional[str] = None
    performance: Optional[PerformanceSummary] = None
    xai: Optional[dict] = None
