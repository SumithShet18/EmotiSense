from pydantic import BaseModel
from typing import Optional, Any


class TokenImportance(BaseModel):
    token: str
    importance: float
    normalized_importance: float


class AudioFeatures(BaseModel):
    energy: Optional[dict] = None
    pitch: Optional[dict] = None
    speech_rate: Optional[dict] = None
    pauses: Optional[dict] = None
    spectral: Optional[dict] = None


class ModalityContributions(BaseModel):
    text: float
    audio: float


class AttentionRollout(BaseModel):
    attention_matrix: Optional[list] = None
    attended_features: Optional[list] = None


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


class Explanation(BaseModel):
    reasoning: str
    token_importances: list[TokenImportance]
    audio_features: Optional[AudioFeatures] = None
    modality_contributions: ModalityContributions
    attention_rollout: Optional[AttentionRollout] = None
    uncertainty: Uncertainty
    secondary_emotions: list[SecondaryEmotion]


class XAIResponse(BaseModel):
    prediction: PredictionInfo
    explanation: Explanation
