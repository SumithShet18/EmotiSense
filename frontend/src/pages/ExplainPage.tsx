import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getLastResult, explain } from '../api/client';
import type { FullResultResponse, XAIResponse, Explanation } from '../types';

const emotionColors: Record<string, string> = {
  angry: '#ef4444', happy: '#22c55e', sad: '#3b82f6',
  neutral: '#6b7280', frustrated: '#f97316',
};

const certaintyColors: Record<string, string> = {
  high: '#22c55e', moderate: '#f59e0b', low: '#ef4444',
};

function ConvergenceBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const color = value >= 0.85 ? '#22c55e' : value >= 0.65 ? '#f59e0b' : '#ef4444';
  const label = value >= 0.85 ? 'Confident' : value >= 0.65 ? 'Moderate' : 'Weak';
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ color, backgroundColor: `${color}18` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label} attribution ({value.toFixed(2)})
    </span>
  );
}

export default function ExplainPage() {
  const [lastResult, setLastResult] = useState<FullResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [computingFaithful, setComputingFaithful] = useState(false);
  const [faithfulResult, setFaithfulResult] = useState<XAIResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getLastResult();
        setLastResult(res);
      } catch {
        setError('No previous prediction found. Run an analysis first.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const xai: Explanation | undefined = lastResult?.xai ?? undefined;
  const showXai = lastResult && xai;

  const handleComputeFaithful = async () => {
    setComputingFaithful(true);
    try {
      const res = await explain(lastResult?.transcript || undefined);
      setFaithfulResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faithful attribution failed.');
    } finally {
      setComputingFaithful(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">XAI</p>
        <h1 className="text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-tight mt-1 text-foreground">
          Explainable Emotion Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically generated from your last analysis — no re-upload needed.
        </p>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-3.5 rounded-xl text-sm">
          {error}
        </div>
      )}

      {lastResult && (
        <>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">Predicted Emotion</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-3xl" style={{ color: emotionColors[lastResult.emotion.toLowerCase()] || '#bf83fc' }}>
                    {lastResult.emotion}
                  </span>
                  <span className="text-lg font-semibold text-foreground capitalize">{lastResult.emotion}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">Confidence</span>
                <div className="text-2xl font-bold text-foreground mt-0.5">{(lastResult.confidence * 100).toFixed(1)}%</div>
              </div>
            </div>
            {lastResult.transcript && (
              <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-border text-sm text-muted-foreground">
                "{lastResult.transcript}"
              </div>
            )}
          </motion.div>

          {showXai && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Clinical Reasoning</h2>
                {xai.ig_convergence !== null && <ConvergenceBadge value={xai.ig_convergence} />}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{xai.reasoning}</p>

              {!faithfulResult && !xai.faithful && (
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={handleComputeFaithful}
                    disabled={computingFaithful}
                    className="btn-primary text-sm !px-4 !py-2 inline-flex items-center gap-2"
                  >
                    {computingFaithful ? (
                      <><span className="w-3 h-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin" /> Computing faithful attributions...</>
                    ) : (
                      <>Compute faithful attributions (~3s)</>
                    )}
                  </button>
                  <p className="text-[11px] text-muted-foreground/50 mt-2">Uses Integrated Gradients for per-token and per-segment attribution</p>
                </div>
              )}

              {(faithfulResult?.explanation?.faithful || xai.faithful) && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faithful Attribution</h3>
                  {(faithfulResult?.explanation?.faithful ?? xai.faithful)?.text_token_attributions && (
                    <div className="grid gap-1.5">
                      {(faithfulResult?.explanation?.faithful ?? xai.faithful)!.text_token_attributions!.slice(0, 10).map((ta, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground/50 w-4 text-right">{ta.rank}.</span>
                          <span className="text-foreground font-medium w-20 truncate text-right">{ta.token}</span>
                          <div className="flex-1 h-4 rounded bg-white/[0.04] overflow-hidden">
                            <div className="h-full rounded transition-all" style={{ width: `${Math.abs(ta.normalized) * 100}%`, backgroundColor: ta.attribution > 0 ? '#22c55e' : '#ef4444' }} />
                          </div>
                          <span className="text-muted-foreground w-16 text-right font-mono">{ta.attribution.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {showXai && (
            <div className="grid gap-6 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Token Attention</h2>
                <div className="space-y-2">
                  {xai.inline.text_token_attention.slice(0, 12).map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground w-24 truncate text-right">{t.token}</span>
                      <div className="flex-1 h-5 rounded-md bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-md transition-all duration-500" style={{ width: `${t.weight * 100}%`, backgroundColor: '#bf83fc' }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right font-mono">{t.weight.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Probability Distribution</h2>
                <div className="space-y-2.5">
                  {[...Object.entries(lastResult.probabilities)]
                    .sort((a, b) => b[1] - a[1])
                    .map(([emotion, prob]) => (
                      <div key={emotion}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize text-foreground font-medium">{emotion}</span>
                          <span className="text-muted-foreground font-mono">{(prob * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${prob * 100}%`, backgroundColor: emotionColors[emotion.toLowerCase()] || '#bf83fc' }} />
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Modality Contribution</h2>
                <div className="flex items-center justify-center gap-8 py-4">
                  <div className="relative w-36 h-36">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/[0.06]" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#bf83fc" strokeWidth="2" strokeDasharray={`${xai.inline.modality_gate.text_weight * 100} ${100 - xai.inline.modality_gate.text_weight * 100}`} strokeLinecap="round" className="transition-all duration-1000" />
                      <circle cx="18" cy="18" r="12.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/[0.06] transition-all duration-1000" strokeDasharray={`${xai.inline.modality_gate.audio_weight * 100} ${100 - xai.inline.modality_gate.audio_weight * 100}`} strokeLinecap="round" style={{ strokeDashoffset: -xai.inline.modality_gate.text_weight * 100 }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{(xai.inline.modality_gate.text_weight * 100).toFixed(0)}%</div>
                        <div className="text-[10px] text-muted-foreground/60">Text</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#bf83fc]" /><span className="text-sm text-muted-foreground">Text: {(xai.inline.modality_gate.text_weight * 100).toFixed(0)}%</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#f97316]" /><span className="text-sm text-muted-foreground">Audio: {(xai.inline.modality_gate.audio_weight * 100).toFixed(0)}%</span></div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Audio Feature Analysis</h2>
                {xai.inline.audio_features ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Energy', value: xai.inline.audio_features.energy.level, detail: xai.inline.audio_features.energy.mean.toFixed(4) },
                      { label: 'Pitch Variation', value: xai.inline.audio_features.pitch.variation, detail: `${xai.inline.audio_features.pitch.mean_hz.toFixed(0)} Hz` },
                      { label: 'Speech Rate', value: xai.inline.audio_features.speech_rate.pace, detail: `${xai.inline.audio_features.speech_rate.syllables_per_sec.toFixed(1)}/s` },
                      { label: 'Pauses', value: xai.inline.audio_features.pauses.frequency, detail: `silence ${(xai.inline.audio_features.pauses.silence_ratio * 100).toFixed(0)}%` },
                      { label: 'Timbre', value: xai.inline.audio_features.spectral.timbre, detail: `${xai.inline.audio_features.spectral.centroid_mean.toFixed(0)} Hz centroid` },
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

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Confidence & Uncertainty</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold" style={{ border: `3px solid ${certaintyColors[xai.inline.uncertainty.certainty] || '#6b7280'}`, color: certaintyColors[xai.inline.uncertainty.certainty] || '#6b7280' }}>
                      {(xai.inline.uncertainty.confidence * 100).toFixed(0)}%
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground capitalize">{xai.inline.uncertainty.certainty} Certainty</div>
                      <div className="text-xs text-muted-foreground/60">Entropy: {xai.inline.uncertainty.entropy.toFixed(3)} / {xai.inline.uncertainty.normalized_entropy.toFixed(3)} norm</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-white/[0.03] border border-border p-2.5">
                      <span className="text-muted-foreground/60">Max Probability</span>
                      <div className="text-foreground font-mono font-medium">{(xai.inline.uncertainty.max_probability * 100).toFixed(1)}%</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] border border-border p-2.5">
                      <span className="text-muted-foreground/60">Spread</span>
                      <div className="text-foreground font-mono font-medium">{xai.inline.uncertainty.probability_spread.toFixed(3)}</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">Secondary Emotions</h2>
                <div className="space-y-2">
                  {xai.inline.secondary_emotions.map((se, i) => (
                    <div key={se.emotion} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground/50 w-5">{i + 1}.</span>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: emotionColors[se.emotion.toLowerCase()] || '#bf83fc' }} />
                      <span className="text-sm font-medium text-foreground flex-1 capitalize">{se.emotion}</span>
                      <span className="text-sm font-mono text-muted-foreground">{(se.probability * 100).toFixed(1)}%</span>
                      <div className="w-24 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${se.probability * 100}%`, backgroundColor: emotionColors[se.emotion.toLowerCase()] || '#bf83fc' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {lastResult.performance && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="card p-6">
                  <h2 className="text-sm font-semibold text-foreground mb-4">Performance Metrics</h2>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-white/[0.03] border border-border p-2.5">
                      <span className="text-muted-foreground/60">Latency</span>
                      <div className="text-foreground font-mono font-medium">{lastResult.performance.total_latency_ms.toFixed(0)} ms</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] border border-border p-2.5">
                      <span className="text-muted-foreground/60">Energy</span>
                      <div className="text-foreground font-mono font-medium">{lastResult.performance.total_energy_joules.toFixed(3)} J</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] border border-border p-2.5">
                      <span className="text-muted-foreground/60">Peak Memory</span>
                      <div className="text-foreground font-mono font-medium">{lastResult.performance.peak_memory_mb.toFixed(0)} MB</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] border border-border p-2.5">
                      <span className="text-muted-foreground/60">Avg CPU</span>
                      <div className="text-foreground font-mono font-medium">{lastResult.performance.avg_cpu_usage.toFixed(1)}%</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
