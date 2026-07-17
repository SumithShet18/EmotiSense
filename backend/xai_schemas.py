from pydantic import BaseModel
from typing import Optional


class TokenAttention(BaseModel):
    token: str
    weight: float
    rank: int


class CrossModalAttention(BaseModel):
    aggregated: float
    per_head: list[float]


class ModalityGate(BaseModel):
    audio_weight: float
    text_weight: float
    gate_distribution: dict


class AudioFeatures(BaseModel):
    energy: Optional[dict] = None
    pitch: Optional[dict] = None
    speech_rate: Optional[dict] = None
    pauses: Optional[dict] = None
    spectral: Optional[dict] = None


class Uncertainty(BaseModel):
    confidence: float
    entropy: float
    normalized_entropy: float
    certainty: str
    max_probability: float
    probability_spread: float


class SecondaryEmotion(BaseModel):
    emotion: str
    probability: float


class PredictionInfo(BaseModel):
    emotion: str
    confidence: float
    probabilities: list[dict]
    transcript: str


class InlineExplanation(BaseModel):
    text_token_attention: list[TokenAttention]
    cross_modal_attention: CrossModalAttention
    modality_gate: ModalityGate
    audio_features: Optional[AudioFeatures] = None
    uncertainty: Uncertainty
    secondary_emotions: list[SecondaryEmotion]


class TokenAttribution(BaseModel):
    token: str
    attribution: float
    normalized: float
    rank: int


class AudioSegmentAttribution(BaseModel):
    start_s: float
    end_s: float
    attribution: float
    normalized: float


class FaithfulAttribution(BaseModel):
    text_token_attributions: Optional[list[TokenAttribution]] = None
    audio_segment_attributions: Optional[list[AudioSegmentAttribution]] = None
    baseline_prediction: dict


class Explanation(BaseModel):
    reasoning: str
    inline: InlineExplanation
    faithful: Optional[FaithfulAttribution] = None
    ig_convergence: Optional[float] = None
    ig_steps: Optional[int] = None


class XAIResponse(BaseModel):
    prediction: PredictionInfo
    explanation: Explanation
