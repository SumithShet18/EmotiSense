export interface PredictResponse {
  id: string | number;
  transcript: string | null;
  emotion: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface HistoryItem {
  id: string | number;
  timestamp: string;
  text_input: string | null;
  audio_path: string | null;
  audio_url: string | null;
  emotion: string;
  confidence: number;
  probabilities: Record<string, number> | null;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
}

export interface HealthResponse {
  status: string;
}

export type Emotion = 'angry' | 'happy' | 'sad' | 'neutral' | 'excited' | 'frustrated';

export interface TokenImportance {
  token: string;
  importance: number;
  normalized_importance: number;
}

export interface AudioFeatures {
  energy: { mean: number; variance: number; level: string };
  pitch: { mean_hz: number; variance: number; variation: string };
  speech_rate: { syllables_per_sec: number; pace: string };
  pauses: { silence_ratio: number; frequency: string };
  spectral: { centroid_mean: number; bandwidth_mean: number; timbre: string };
}

export interface ModalityContributions {
  text: number;
  audio: number;
}

export interface Uncertainty {
  confidence: number;
  entropy: number;
  normalized_entropy: number;
  certainty: string;
  max_probability: number;
  probability_spread: number;
}

export interface SecondaryEmotion {
  emotion: string;
  probability: number;
}

export interface XAIResponse {
  prediction: {
    emotion: string;
    confidence: number;
    probabilities: { emotion: string; probability: number }[];
    transcript: string;
  };
  explanation: {
    reasoning: string;
    token_importances: TokenImportance[];
    audio_features: AudioFeatures | null;
    modality_contributions: ModalityContributions;
    attention_rollout: { attention_matrix: number[][] } | null;
    uncertainty: Uncertainty;
    secondary_emotions: SecondaryEmotion[];
  };
}
