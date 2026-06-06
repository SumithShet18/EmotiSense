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
