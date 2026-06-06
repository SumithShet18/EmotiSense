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

export async function healthCheck() {
  return request<{ status: string }>('/health');
}

export async function predict(
  text?: string,
  audio?: File,
): Promise<{
  id: number;
  transcript: string | null;
  emotion: string;
  confidence: number;
  probabilities: Record<string, number>;
}> {
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

export async function getHistory(limit = 100, offset = 0) {
  return request<{
    items: {
      id: number;
      timestamp: string;
      text_input: string | null;
      audio_path: string | null;
      emotion: string;
      confidence: number;
      probabilities: Record<string, number> | null;
    }[];
    total: number;
  }>(`/history?limit=${limit}&offset=${offset}`);
}

export async function getPrediction(id: number) {
  return request<{
    id: number;
    timestamp: string;
    text_input: string | null;
    audio_path: string | null;
    emotion: string;
    confidence: number;
    probabilities: Record<string, number> | null;
  }>(`/prediction/${id}`);
}
