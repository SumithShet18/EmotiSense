import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { explain } from '../api/client';
import type { XAIResponse } from '../types';

const emotionColors: Record<string, string> = {
  angry: '#ef4444', happy: '#22c55e', sad: '#3b82f6',
  neutral: '#6b7280', excited: '#a855f7', frustrated: '#f97316',
};

const certaintyColors: Record<string, string> = {
  high: '#22c55e', moderate: '#f59e0b', low: '#ef4444',
};

export default function ExplainPage() {
  const [text, setText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<XAIResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!text.trim() && !audioFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await explain(text || undefined, audioFile || undefined);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Explainability analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const maxTokenImp = result
    ? Math.max(...result.explanation.token_importances.map((t) => t.importance), 0.01)
    : 1;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">XAI</p>
        <h1 className="text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-tight mt-1 text-foreground">
          Explainable Emotion Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every explanation is derived from actual model outputs — Integrated Gradients, attention analysis, and audio feature extraction.
        </p>
      </motion.div>

      {/* Input */}
      <div className="card p-5 space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text for emotion analysis..."
          rows={3}
          className="input-field w-full resize-none"
        />
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:bg-white/5 file:text-sm file:text-foreground"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || (!text.trim() && !audioFile)}
            className="btn-primary text-sm ml-auto disabled:opacity-40"
          >
            {loading ? 'Analyzing...' : 'Analyze & Explain'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-3.5 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {result && (
        <>
          {/* Prediction Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">Predicted Emotion</span>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className="text-3xl"
                    style={{ color: emotionColors[result.prediction.emotion.toLowerCase()] || '#bf83fc' }}
                  >
                    {result.prediction.emotion}
                  </span>
                  <span className="text-lg font-semibold text-foreground capitalize">
                    {result.prediction.emotion}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">Confidence</span>
                <div className="text-2xl font-bold text-foreground mt-0.5">
                  {(result.prediction.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            {result.prediction.transcript && (
              <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-border text-sm text-muted-foreground">
                "{result.prediction.transcript}"
              </div>
            )}
          </motion.div>

          {/* Emotion Reasoning */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card p-6"
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">Emotion Reasoning</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.explanation.reasoning}
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Token Importance */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-6"
            >
              <h2 className="text-sm font-semibold text-foreground mb-4">Token Importance (Integrated Gradients)</h2>
              <div className="space-y-2">
                {result.explanation.token_importances
                  .filter((t) => t.importance > 0.01)
                  .slice(0, 15)
                  .map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground w-24 truncate text-right">
                        {t.token}
                      </span>
                      <div className="flex-1 h-5 rounded-md bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{
                            width: `${(t.importance / maxTokenImp) * 100}%`,
                            backgroundColor: t.importance > 0 ? '#bf83fc' : '#ef444444',
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right font-mono">
                        {t.normalized_importance.toFixed(3)}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="mt-3 text-[10px] text-muted-foreground/50">
                Scores from Integrated Gradients — path integral of gradients from baseline to input
              </div>
            </motion.div>

            {/* Probability Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card p-6"
            >
              <h2 className="text-sm font-semibold text-foreground mb-4">Probability Distribution</h2>
              <div className="space-y-2.5">
                {[...result.prediction.probabilities]
                  .sort((a, b) => b.probability - a.probability)
                  .map((p) => (
                    <div key={p.emotion}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize text-foreground font-medium">{p.emotion}</span>
                        <span className="text-muted-foreground font-mono">
                          {(p.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${p.probability * 100}%`,
                            backgroundColor: emotionColors[p.emotion.toLowerCase()] || '#bf83fc',
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>

            {/* Modality Contribution */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h2 className="text-sm font-semibold text-foreground mb-4">Modality Contribution</h2>
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="relative w-36 h-36">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/[0.06]" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none" stroke="#bf83fc" strokeWidth="2"
                      strokeDasharray={`${result.explanation.modality_contributions.text * 100} ${100 - result.explanation.modality_contributions.text * 100}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                    <circle
                      cx="18" cy="18" r="12.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/[0.06]"
                      strokeDasharray={`${result.explanation.modality_contributions.audio * 100} ${100 - result.explanation.modality_contributions.audio * 100}`}
                      strokeLinecap="round"
                      style={{ strokeDashoffset: -result.explanation.modality_contributions.text * 100 }}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {(result.explanation.modality_contributions.text * 100).toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground/60">Text</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-[#bf83fc]" />
                    <span className="text-sm text-muted-foreground">
                      Text: {(result.explanation.modality_contributions.text * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-[#f97316]" />
                    <span className="text-sm text-muted-foreground">
                      Audio: {(result.explanation.modality_contributions.audio * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground/50 text-center">
                Derived from ablation — comparing output with each modality alone vs both
              </div>
            </motion.div>

            {/* Audio Features */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card p-6"
            >
              <h2 className="text-sm font-semibold text-foreground mb-4">Audio Feature Analysis</h2>
              {result.explanation.audio_features ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Energy', value: result.explanation.audio_features.energy.level, detail: result.explanation.audio_features.energy.mean.toFixed(4) },
                    { label: 'Pitch Variation', value: result.explanation.audio_features.pitch.variation, detail: `${result.explanation.audio_features.pitch.mean_hz.toFixed(0)} Hz` },
                    { label: 'Speech Rate', value: result.explanation.audio_features.speech_rate.pace, detail: `${result.explanation.audio_features.speech_rate.syllables_per_sec.toFixed(1)}/s` },
                    { label: 'Pauses', value: result.explanation.audio_features.pauses.frequency, detail: `silence ${(result.explanation.audio_features.pauses.silence_ratio * 100).toFixed(0)}%` },
                    { label: 'Timbre', value: result.explanation.audio_features.spectral.timbre, detail: `${result.explanation.audio_features.spectral.centroid_mean.toFixed(0)} Hz centroid` },
                  ].map((f) => (
                    <div key={f.label} className="rounded-lg bg-white/[0.03] border border-border p-3">
                      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{f.label}</span>
                      <div className="text-sm font-semibold text-foreground mt-0.5 capitalize">{f.value}</div>
                      <div className="text-[11px] text-muted-foreground/50 mt-0.5">{f.detail}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60">No audio file provided for analysis.</p>
              )}
            </motion.div>

            {/* Attention Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h2 className="text-sm font-semibold text-foreground mb-4">Cross-Modal Attention</h2>
              {result.explanation.attention_rollout?.attention_matrix ? (
                <div className="overflow-x-auto">
                  <div className="inline-flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground/60 mb-2">Text → Audio Attention Weights</span>
                    <div
                      className="grid gap-0.5"
                      style={{
                        gridTemplateColumns: `repeat(${result.explanation.attention_rollout.attention_matrix[0]?.length || 1}, 1fr)`,
                      }}
                    >
                      {result.explanation.attention_rollout.attention_matrix.map((row, ri) =>
                        row.map((val: number, ci: number) => (
                          <div
                            key={`${ri}-${ci}`}
                            className="w-6 h-6 rounded-sm"
                            style={{
                              backgroundColor: `rgba(191, 131, 252, ${Math.min(val * 2, 1)})`,
                            }}
                            title={`h${ri}→${ci}: ${val.toFixed(3)}`}
                          />
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground/60">
                      <span>0</span>
                      <div className="w-20 h-2 rounded-full" style={{ background: 'linear-gradient(to right, rgba(191,131,252,0), rgba(191,131,252,1))' }} />
                      <span>max</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60">
                  {result.explanation.attention_rollout === null
                    ? 'Requires both text and audio inputs.'
                    : 'Attention weights not available in demo mode.'}
                </p>
              )}
              <div className="mt-3 text-[10px] text-muted-foreground/50">
                Each cell shows how strongly a text attention head weights a corresponding audio feature.
              </div>
            </motion.div>

            {/* Uncertainty & Certainty */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="card p-6"
            >
              <h2 className="text-sm font-semibold text-foreground mb-4">Confidence & Uncertainty</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      border: `3px solid ${certaintyColors[result.explanation.uncertainty.certainty] || '#6b7280'}`,
                      color: certaintyColors[result.explanation.uncertainty.certainty] || '#6b7280',
                    }}
                  >
                    {(result.explanation.uncertainty.confidence * 100).toFixed(0)}%
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground capitalize">
                      {result.explanation.uncertainty.certainty} Certainty
                    </div>
                    <div className="text-xs text-muted-foreground/60">
                      Entropy: {result.explanation.uncertainty.entropy.toFixed(3)} / {result.explanation.uncertainty.normalized_entropy.toFixed(3)} norm
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white/[0.03] border border-border p-2.5">
                    <span className="text-muted-foreground/60">Max Probability</span>
                    <div className="text-foreground font-mono font-medium">{(result.explanation.uncertainty.max_probability * 100).toFixed(1)}%</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-border p-2.5">
                    <span className="text-muted-foreground/60">Spread</span>
                    <div className="text-foreground font-mono font-medium">{result.explanation.uncertainty.probability_spread.toFixed(3)}</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Secondary Emotions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6"
            >
              <h2 className="text-sm font-semibold text-foreground mb-4">Secondary Emotions</h2>
              <div className="space-y-2">
                {result.explanation.secondary_emotions.map((se, i) => (
                  <div key={se.emotion} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground/50 w-5">{i + 1}.</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: emotionColors[se.emotion.toLowerCase()] || '#bf83fc' }}
                    />
                    <span className="text-sm font-medium text-foreground flex-1 capitalize">{se.emotion}</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      {(se.probability * 100).toFixed(1)}%
                    </span>
                    <div className="w-24 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${se.probability * 100}%`,
                          backgroundColor: emotionColors[se.emotion.toLowerCase()] || '#bf83fc',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
