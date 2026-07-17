export interface PredictResponse {
  id: string | number;
  transcript: string | null;
  emotion: string;
  confidence: number;
  probabilities: Record<string, number>;
  performance?: PerformanceSummary | null;
  inline_explanation?: Record<string, unknown> | null;
}

export interface StageMetrics {
  component: string;
  latency_ms: number;
  cpu_usage: number;
  memory_mb: number;
  energy_joules: number;
}

export interface PerformanceSummary {
  stages: StageMetrics[];
  total_latency_ms: number;
  total_energy_joules: number;
  peak_memory_mb: number;
  avg_cpu_usage: number;
  throughput_inferences_per_sec: number;
}

export interface PerformanceLog {
  id: number;
  timestamp: string;
  prediction_id: number | string;
  component: string;
  latency_ms: number;
  memory_mb: number;
  cpu_usage: number;
  energy_joules: number;
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

export type Emotion = 'angry' | 'happy' | 'sad' | 'neutral' | 'frustrated';

export interface AudioFeatures {
  energy: { mean: number; variance: number; level: string };
  pitch: { mean_hz: number; variance: number; variation: string };
  speech_rate: { syllables_per_sec: number; pace: string };
  pauses: { silence_ratio: number; frequency: string };
  spectral: { centroid_mean: number; bandwidth_mean: number; timbre: string };
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

export interface TokenAttention {
  token: string;
  weight: number;
  rank: number;
}

export interface CrossModalAttention {
  aggregated: number;
  per_head: number[];
}

export interface ModalityGate {
  audio_weight: number;
  text_weight: number;
  gate_distribution: Record<string, number>;
}

export interface InlineExplanation {
  text_token_attention: TokenAttention[];
  cross_modal_attention: CrossModalAttention;
  modality_gate: ModalityGate;
  audio_features: AudioFeatures | null;
  uncertainty: Uncertainty;
  secondary_emotions: SecondaryEmotion[];
}

export interface TokenAttribution {
  token: string;
  attribution: number;
  normalized: number;
  rank: number;
}

export interface AudioSegmentAttribution {
  start_s: number;
  end_s: number;
  attribution: number;
  normalized: number;
}

export interface FaithfulAttribution {
  text_token_attributions: TokenAttribution[] | null;
  audio_segment_attributions: AudioSegmentAttribution[] | null;
  baseline_prediction: { emotion: string; probabilities: Record<string, number> };
}

export interface Explanation {
  reasoning: string;
  inline: InlineExplanation;
  faithful: FaithfulAttribution | null;
  ig_convergence: number | null;
  ig_steps: number | null;
}

export interface FullResultResponse {
  prediction_id: string | number;
  emotion: string;
  confidence: number;
  probabilities: Record<string, number>;
  transcript: string | null;
  text_input: string | null;
  audio_url: string | null;
  timestamp: string | null;
  transcription_warning: string | null;
  performance: PerformanceSummary | null;
  xai: Explanation | null;
}

export interface XAIResponse {
  prediction: {
    emotion: string;
    confidence: number;
    probabilities: { emotion: string; probability: number }[];
    transcript: string;
  };
  explanation: Explanation;
}
