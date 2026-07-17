-- EmotiSense Supabase Migration
-- Run this in Supabase SQL Editor to create the emotion_logs table

CREATE TABLE IF NOT EXISTS emotion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transcript TEXT,
    emotion TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    probabilities JSONB,
    audio_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emotion_logs_emotion ON emotion_logs(emotion);
CREATE INDEX IF NOT EXISTS idx_emotion_logs_created_at ON emotion_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_logs_transcript ON emotion_logs USING gin(to_tsvector('english', COALESCE(transcript, '')));

ALTER TABLE emotion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read" ON emotion_logs FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON emotion_logs FOR INSERT WITH CHECK (true);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow anon read audio" ON storage.objects FOR SELECT USING (bucket_id = 'audio-files');
CREATE POLICY "Allow anon upload audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio-files');

-- XAI explanations table
CREATE TABLE IF NOT EXISTS explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES emotion_logs(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reasoning TEXT NOT NULL,
    token_importances JSONB NOT NULL DEFAULT '[]',
    modality_contributions JSONB NOT NULL DEFAULT '{}',
    audio_features JSONB,
    attention_matrix JSONB,
    uncertainty JSONB NOT NULL DEFAULT '{}',
    secondary_emotions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE explanations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read explanations" ON explanations FOR SELECT USING (true);
CREATE POLICY "Allow anon insert explanations" ON explanations FOR INSERT WITH CHECK (true);
