const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

async function requestWithRetry<T>(path: string, options?: RequestInit, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await request<T>(path, options);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Request failed after retries');
}

export async function healthCheck() {
  return request<{ status: string }>('/health');
}

export async function predict(
  text?: string,
  audio?: File,
): Promise<import('../types').PredictResponse> {
  const form = new FormData();
  if (text) form.append('text', text);
  if (audio) form.append('audio', audio);

  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Prediction failed with status ${res.status}`);
  }

  return res.json();
}

export async function getHistory(
  limit = 100,
  offset = 0,
  search = '',
  emotion = '',
) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search) params.set('search', search);
  if (emotion) params.set('emotion', emotion);
  return requestWithRetry<{
    items: {
      id: string | number;
      timestamp: string;
      text_input: string | null;
      audio_path: string | null;
      audio_url: string | null;
      emotion: string;
      confidence: number;
      probabilities: Record<string, number> | null;
    }[];
    total: number;
  }>(`/history?${params}`);
}

export async function explain(text?: string, audio?: File) {
  const form = new FormData();
  if (text) form.append('text', text);
  if (audio) form.append('audio', audio);

  const res = await fetch(`${API_BASE}/explain`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Explain failed with status ${res.status}`);
  }

  return res.json() as Promise<import('../types').XAIResponse>;
}

export async function getPrediction(id: string | number) {
  return request<{
    id: string | number;
    timestamp: string;
    text_input: string | null;
    audio_path: string | null;
    audio_url: string | null;
    emotion: string;
    confidence: number;
    probabilities: Record<string, number> | null;
  }>(`/prediction/${id}`);
}

export async function getPerformance(predictionId?: number) {
  const params = predictionId ? `?prediction_id=${predictionId}` : '';
  return request<{
    items: import('../types').PerformanceLog[];
  }>(`/performance${params}`);
}

export async function getLastResult() {
  return request<import('../types').FullResultResponse>('/last-result');
}

export type { FullResultResponse } from '../types';
