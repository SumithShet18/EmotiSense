import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { getLastResult } from '../api/client';
import type { FullResultResponse } from '../types';

const emotionColors: Record<string, string> = {
  angry: '#ef4444', happy: '#22c55e', sad: '#3b82f6',
  neutral: '#6b7280', excited: '#a855f7', frustrated: '#f97316',
};

const emotionGradients: Record<string, string> = {
  angry: 'from-red-500 to-red-600',
  happy: 'from-green-500 to-green-600',
  sad: 'from-blue-500 to-blue-600',
  neutral: 'from-gray-500 to-gray-600',
  excited: 'from-purple-500 to-purple-600',
  frustrated: 'from-orange-500 to-orange-600',
};

const certaintyLabels: Record<string, { label: string; color: string }> = {
  high: { label: 'High Certainty', color: '#22c55e' },
  moderate: { label: 'Moderate Certainty', color: '#f59e0b' },
  low: { label: 'Low Certainty', color: '#ef4444' },
};

function ConfidenceGauge({ value, size = 100 }: { value: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - value * circumference;
  const color = value > 0.7 ? '#22c55e' : value > 0.4 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        className="transition-all duration-1000" />
    </svg>
  );
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-2xl font-bold text-primary/30 font-mono">{number}</span>
      <h2 className="text-xl font-semibold text-foreground tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-5">
      <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ? '' : 'text-foreground'}`} style={color ? { color } : {}}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground/50 mt-1">{sub}</p>}
    </div>
  );
}

function StageTimingBar({ name, ms, maxMs, color }: { name: string; ms: number; maxMs: number; color: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-foreground w-40 shrink-0 text-right font-medium">{name}</span>
      <div className="flex-1 h-6 rounded-lg bg-white/[0.04] overflow-hidden">
        <div className="h-full rounded-lg transition-all duration-700" style={{ width: `${(ms / maxMs) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-muted-foreground font-mono w-20 text-right">{ms.toFixed(2)}ms</span>
    </div>
  );
}

export default function FinalReportPage() {
  const [result, setResult] = useState<FullResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getLastResult();
        setResult(res);
      } catch {
        setError('No prediction found. Run an analysis on the Analyze page first.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-xl text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { emotion, confidence, probabilities, transcript, text_input, timestamp, performance, xai } = result;
  const emoLower = emotion.toLowerCase();
  const primaryColor = emotionColors[emoLower] || '#bf83fc';
  const sortedProbs = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  const secondaryEmotion = sortedProbs.length > 1 ? sortedProbs[1] : null;
  const topKeywords = xai?.token_importances?.filter(t => t.importance > 0.01).sort((a, b) => b.importance - a.importance) || [];
  const certaintyInfo = xai?.uncertainty ? certaintyLabels[xai.uncertainty.certainty] || certaintyLabels.low : null;
  const displayText = transcript || text_input || '';
  const wordCount = displayText ? displayText.split(/\s+/).filter(Boolean).length : 0;
  const displayTimestamp = timestamp || (xai?.uncertainty ? new Date().toISOString() : 'N/A');

  const costEstimate = performance ? ((performance.total_latency_ms / 1000) * 0.0000167 + (performance.total_energy_joules / 3600) * 0.12).toFixed(6) : 'N/A';

  return (
    <div ref={reportRef}>
      {/* Print-only header */}
      <div className="hidden print:block text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-gray-400">EmotiSense — Final AI Assessment Report</p>
        <p className="text-[10px] text-gray-500 mt-1">Generated {new Date().toLocaleString()}</p>
      </div>

      {/* Toolbar */}
      <div className="print:hidden mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Final Report</p>
          <h1 className="text-[clamp(1.8rem,4vw,2.5rem)] font-semibold tracking-tight mt-1 text-foreground">
            AI Assessment Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive emotion analysis generated from the latest prediction.
          </p>
        </div>
        <button onClick={handlePrint} className="btn-primary text-sm !px-5 !py-2.5 inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
          </svg>
          Export PDF
        </button>
      </div>

      <div className="space-y-10">
        {/* ============================================================ */}
        {/* SECTION 1: EXECUTIVE SUMMARY */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          {/* Hero gradient banner */}
          <div className="relative h-2" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}88, transparent)` }} />
          <div className="p-6 sm:p-8">
            <SectionHeading number="01" title="Executive Summary" />

            <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
              <div className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative">
                    <ConfidenceGauge value={confidence} size={88} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-foreground">{(confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">Primary Emotion</p>
                    <p className="text-3xl font-bold capitalize text-foreground" style={{ color: primaryColor }}>{emotion}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {certaintyInfo && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${certaintyInfo.color}20`, color: certaintyInfo.color, border: `1px solid ${certaintyInfo.color}40` }}>
                          {certaintyInfo.label}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground/60">
                        {(confidence * 100).toFixed(1)}% confidence
                      </span>
                    </div>
                  </div>
                </div>

                {secondaryEmotion && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Secondary:</span>
                    <span className="capitalize font-medium text-foreground">{secondaryEmotion[0]}</span>
                    <span className="text-muted-foreground/60">({(secondaryEmotion[1] * 100).toFixed(1)}%)</span>
                  </div>
                )}

                <div className="text-xs text-muted-foreground/60 flex items-center gap-4 flex-wrap">
                  <span>Analysis ID: #{result.prediction_id}</span>
                  {displayTimestamp !== 'N/A' && (
                    <span>Processed: {new Date(displayTimestamp).toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="lg:text-right">
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">Report Generated</p>
                <p className="text-sm text-foreground font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-xs text-muted-foreground/60">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>

            {/* Narrative summary */}
            <div className="mt-6 p-5 rounded-xl bg-white/[0.02] border border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This report presents the results of an AI-powered multimodal emotion analysis performed by the EmotiSense system.
                The analysis detected <strong className="text-foreground capitalize">{emotion}</strong> as the primary emotional state
                with <strong className="text-foreground">{(confidence * 100).toFixed(1)}% confidence</strong>
                {secondaryEmotion ? `, and ${secondaryEmotion[0]} as a secondary emotion at ${(secondaryEmotion[1] * 100).toFixed(1)}%` : ''}.
                {transcript ? ` The transcribed speech contained ${wordCount} words` : ''}
                {certaintyInfo ? `, with ${certaintyInfo.label.toLowerCase()}.` : '.'}
                {performance ? ` The full pipeline completed in ${performance.total_latency_ms.toFixed(2)}ms.` : ''}
              </p>
            </div>
          </div>
        </motion.section>

        {/* ============================================================ */}
        {/* SECTION 2: TRANSCRIPTION REPORT */}
        {/* ============================================================ */}
        {displayText && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card p-6 sm:p-8"
          >
            <SectionHeading number="02" title="Transcription Report" />
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-white/[0.03] border border-border">
                <p className="text-base text-foreground leading-relaxed italic border-l-2 border-primary/40 pl-4">
                  &ldquo;{displayText}&rdquo;
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Word Count" value={wordCount.toString()} sub="Total words" />
                <StatCard label="Characters" value={displayText.length.toString()} sub="Including spaces" />
                <StatCard label="Avg Word Length" value={(displayText.length / Math.max(wordCount, 1)).toFixed(1)} sub="Characters per word" />
                {xai?.audio_features?.speech_rate && (
                  <StatCard
                    label="Speech Rate"
                    value={`${xai.audio_features.speech_rate.syllables_per_sec.toFixed(1)}/s`}
                    sub={`Pace: ${xai.audio_features.speech_rate.pace}`}
                  />
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* ============================================================ */}
        {/* SECTION 3: EMOTION ANALYSIS */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 sm:p-8"
        >
          <SectionHeading number="03" title="Emotion Analysis" />

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bar Chart */}
            <div>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4">Emotion Distribution</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sortedProbs.map(([em, prob]) => ({ emotion: em, probability: +(prob * 100).toFixed(1), fill: emotionColors[em.toLowerCase()] || '#bf83fc' }))} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <XAxis dataKey="emotion" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #24243a', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#f0f0f7', fontWeight: 600 }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`]}
                  />
                  <Bar dataKey="probability" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {sortedProbs.map(([em]) => (
                      <Cell key={em} fill={emotionColors[em.toLowerCase()] || '#bf83fc'} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Confidence Breakdown */}
            <div>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4">Confidence Breakdown</p>
              <div className="space-y-4">
                {sortedProbs.map(([em, prob], i) => {
                  const pct = +(prob * 100).toFixed(1);
                  const isTop = i === 0;
                  const isSecondary = i === 1;
                  const color = emotionColors[em.toLowerCase()] || '#bf83fc';
                  return (
                    <div key={em}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="capitalize font-medium text-foreground">{em}</span>
                          {isTop && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${color}20`, color }}>Primary</span>}
                          {isSecondary && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-muted-foreground/60 bg-white/[0.04]">Secondary</span>}
                        </span>
                        <span className="font-mono text-foreground font-medium">{pct}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Primary vs Secondary */}
              <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-border">
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-2">Primary vs Secondary</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: primaryColor }} />
                    <span className="text-sm text-foreground capitalize font-medium">{emotion}</span>
                    <span className="text-xs text-muted-foreground">{(confidence * 100).toFixed(1)}%</span>
                  </div>
                  {secondaryEmotion && (
                    <>
                      <span className="text-muted-foreground/30">|</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: emotionColors[secondaryEmotion[0].toLowerCase()] || '#6b7280' }} />
                        <span className="text-sm text-muted-foreground capitalize font-medium">{secondaryEmotion[0]}</span>
                        <span className="text-xs text-muted-foreground">{(secondaryEmotion[1] * 100).toFixed(1)}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ============================================================ */}
        {/* SECTION 4: EXPLAINABLE AI REPORT */}
        {/* ============================================================ */}
        {xai && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-6 sm:p-8"
          >
            <SectionHeading number="04" title="Explainable AI Report" />

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Token Importance */}
              <div>
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4">Top Contributing Keywords</p>
                <div className="space-y-2.5">
                  {topKeywords.slice(0, 12).map((t, i) => {
                    const maxImp = Math.max(...topKeywords.map(tk => tk.importance), 0.01);
                    const pct = (t.importance / maxImp) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground/40 w-5 text-right font-mono">{i + 1}.</span>
                        <span className="text-sm font-medium text-foreground w-24 truncate text-right">{t.token}</span>
                        <div className="flex-1 h-5 rounded-md bg-white/[0.04] overflow-hidden">
                          <div className="h-full rounded-md transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: primaryColor, opacity: 0.6 + 0.4 * (t.importance / maxImp) }} />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono w-16 text-right">{(t.normalized_importance * 100).toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
                {topKeywords.length === 0 && (
                  <p className="text-sm text-muted-foreground/60">No keyword importance data available.</p>
                )}
              </div>

              {/* Modality + Reasoning */}
              <div className="space-y-6">
                {/* Modality Contribution */}
                <div>
                  <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4">Modality Contribution</p>
                  <div className="flex items-center justify-center gap-8 py-4">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/[0.06]" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#bf83fc" strokeWidth="2.5"
                          strokeDasharray={`${xai.modality_contributions.text * 100} ${100 - xai.modality_contributions.text * 100}`}
                          strokeLinecap="round" className="transition-all duration-1000" />
                        <circle cx="18" cy="18" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/[0.06]" />
                        <circle cx="18" cy="18" r="12" fill="none" stroke="#f97316" strokeWidth="2.5"
                          strokeDasharray={`${xai.modality_contributions.audio * 100} ${100 - xai.modality_contributions.audio * 100}`}
                          strokeLinecap="round" className="transition-all duration-1000"
                          style={{ strokeDashoffset: xai.modality_contributions.text ? -xai.modality_contributions.text * 100 : 0 }} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{(xai.modality_contributions.text * 100).toFixed(0)}%</div>
                          <div className="text-[10px] text-muted-foreground/60">Text</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-sm bg-[#bf83fc]" />
                        <div>
                          <span className="text-sm text-muted-foreground">Text: {(xai.modality_contributions.text * 100).toFixed(0)}%</span>
                          <p className="text-[10px] text-muted-foreground/40">Keyword-based semantic analysis</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-sm bg-[#f97316]" />
                        <div>
                          <span className="text-sm text-muted-foreground">Audio: {(xai.modality_contributions.audio * 100).toFixed(0)}%</span>
                          <p className="text-[10px] text-muted-foreground/40">Acoustic feature extraction</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-border">
                  <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-2">Reasoning Summary</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{xai.reasoning}</p>
                </div>
              </div>
            </div>

            {/* Uncertainty */}
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <StatCard label="Confidence" value={`${(xai.uncertainty.confidence * 100).toFixed(1)}%`} sub={`Certainty: ${xai.uncertainty.certainty}`} color={certaintyInfo?.color} />
              <StatCard label="Entropy" value={xai.uncertainty.entropy.toFixed(3)} sub={`Normalized: ${xai.uncertainty.normalized_entropy.toFixed(3)}`} />
              <StatCard label="Max Probability" value={`${(xai.uncertainty.max_probability * 100).toFixed(1)}%`} sub="Highest class score" />
              <StatCard label="Probability Spread" value={xai.uncertainty.probability_spread.toFixed(4)} sub="Distribution width" />
            </div>
          </motion.section>
        )}

        {/* ============================================================ */}
        {/* SECTION 5: AUDIO ANALYTICS */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6 sm:p-8"
        >
          <SectionHeading number="05" title="Audio Analytics" />

          {xai?.audio_features ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Energy Level"
                  value={xai.audio_features.energy.level}
                  sub={`Mean: ${xai.audio_features.energy.mean.toFixed(4)}`}
                />
                <StatCard
                  label="Pitch Variation"
                  value={xai.audio_features.pitch.variation}
                  sub={`${xai.audio_features.pitch.mean_hz.toFixed(0)} Hz mean`}
                />
                <StatCard
                  label="Speech Rate"
                  value={xai.audio_features.speech_rate.pace}
                  sub={`${xai.audio_features.speech_rate.syllables_per_sec.toFixed(1)} syllables/s`}
                />
                <StatCard
                  label="Pause Frequency"
                  value={xai.audio_features.pauses.frequency}
                  sub={`Silence: ${(xai.audio_features.pauses.silence_ratio * 100).toFixed(0)}%`}
                />
                <StatCard
                  label="Timbre"
                  value={xai.audio_features.spectral.timbre}
                  sub={`${xai.audio_features.spectral.centroid_mean.toFixed(0)} Hz centroid`}
                />
                <StatCard
                  label="Spectral Bandwidth"
                  value={`${xai.audio_features.spectral.bandwidth_mean.toFixed(0)} Hz`}
                  sub="Frequency spread"
                />
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-border">
                  <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-2">Audio Observations</p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    {xai.audio_features.energy.level === 'high' && <li className="flex gap-2"><span className="text-primary shrink-0">&#9656;</span> Elevated energy levels suggest heightened emotional arousal.</li>}
                    {xai.audio_features.energy.level === 'low' && <li className="flex gap-2"><span className="text-primary shrink-0">&#9656;</span> Low energy levels indicate calm or subdued affect.</li>}
                    {xai.audio_features.energy.level === 'moderate' && <li className="flex gap-2"><span className="text-primary shrink-0">&#9656;</span> Moderate energy levels suggest a balanced emotional state.</li>}
                    {xai.audio_features.pitch.variation === 'high' && <li className="flex gap-2"><span className="text-primary shrink-0">&#9656;</span> Wide pitch variation indicates dynamic prosody and expressiveness.</li>}
                    {xai.audio_features.pitch.variation === 'low' && <li className="flex gap-2"><span className="text-primary shrink-0">&#9656;</span> Monotone pitch range suggests flat or depressed affect.</li>}
                    {xai.audio_features.speech_rate.pace === 'fast' && <li className="flex gap-2"><span className="text-primary shrink-0">&#9656;</span> Rapid speech rate may indicate excitement, anxiety, or urgency.</li>}
                    {xai.audio_features.speech_rate.pace === 'slow' && <li className="flex gap-2"><span className="text-primary shrink-0">&#9656;</span> Slower speech rate suggests deliberation, sadness, or fatigue.</li>}
                    {xai.audio_features.pauses.frequency === 'frequent' && <li className="flex gap-2"><span className="text-primary shrink-0">&#9656;</span> Frequent pauses may indicate hesitation or cognitive load.</li>}
                    {xai.audio_features.speech_rate.pace === 'moderate' && <li className="flex gap-2"><span className="text-primary shrink-0">&#9656;</span> Moderate speech rate is consistent with neutral or conversational delivery.</li>}
                  </ul>
                </div>

                {/* Modality inference note */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-border">
                  <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-2">Signal Analysis</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The audio modality contributed <strong className="text-foreground">{(xai.modality_contributions.audio * 100).toFixed(0)}%</strong> to the final prediction.
                    {xai.modality_contributions.audio > 0.5 ? ' Acoustic features played a dominant role in the emotion classification.' : ' The textual transcript was the primary driver of the emotion classification.'}
                    {xai.audio_features.spectral.centroid_mean > 2000 ? ' The spectral centroid is high, suggesting bright timbre typical of energetic speech.' : ' The spectral centroid is low, consistent with a warmer, darker vocal timbre.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-white/[0.03] border border-border text-center">
              <p className="text-sm text-muted-foreground/60">No audio file was provided for this analysis.</p>
              <p className="text-xs text-muted-foreground/40 mt-1">Audio analytics require a voice recording or uploaded audio file.</p>
            </div>
          )}
        </motion.section>

        {/* ============================================================ */}
        {/* SECTION 6: SYSTEM PERFORMANCE REPORT */}
        {/* ============================================================ */}
        {performance && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card p-6 sm:p-8"
          >
            <SectionHeading number="06" title="System Performance Report" />

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total Latency" value={`${performance.total_latency_ms.toFixed(2)}ms`} sub={`${performance.throughput_inferences_per_sec.toFixed(0)} inferences/s`} />
                <StatCard label="Energy Consumption" value={`${performance.total_energy_joules.toFixed(4)}J`} sub={`Est. cost: ~$${costEstimate}`} />
                <StatCard label="Peak Memory" value={`${performance.peak_memory_mb.toFixed(1)}MB`} sub="RAM utilization" />
                <StatCard label="Avg CPU Usage" value={`${performance.avg_cpu_usage.toFixed(1)}%`} sub="Processor utilization" />
              </div>

              {/* Pipeline Breakdown */}
              <div>
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4">Pipeline Stage Timing</p>
                <div className="space-y-3">
                  {performance.stages.map((stage, i) => {
                    const maxMs = Math.max(...performance.stages.map(s => s.latency_ms), 0.01);
                    const colors = ['#bf83fc', '#6a9afb', '#f76ec9', '#22c55e', '#f59e0b'];
                    return (
                      <StageTimingBar
                        key={i}
                        name={stage.component}
                        ms={stage.latency_ms}
                        maxMs={maxMs}
                        color={colors[i % colors.length]}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Latency classification */}
            <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-border">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">Performance Classification</p>
              <p className="text-sm text-muted-foreground">
                The pipeline completed in <strong className="text-foreground">{performance.total_latency_ms.toFixed(2)}ms</strong>, which is{' '}
                {performance.total_latency_ms < 100 ? 'real-time capable' :
                 performance.total_latency_ms < 500 ? 'near real-time' :
                 performance.total_latency_ms < 2000 ? 'suitable for batch processing' :
                 'operating under higher than expected latency'}
                . Memory usage of <strong className="text-foreground">{performance.peak_memory_mb.toFixed(1)}MB</strong> is
                {performance.peak_memory_mb < 200 ? ' efficient.' :
                 performance.peak_memory_mb < 500 ? ' reasonable for the model size.' :
                 ' elevated; consider model optimization.'}
                {' '}The system achieved <strong className="text-foreground">{performance.throughput_inferences_per_sec.toFixed(0)}</strong> inferences per second.
              </p>
            </div>
          </motion.section>
        )}

        {/* ============================================================ */}
        {/* SECTION 7: CLOUD EXECUTION REPORT */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6 sm:p-8"
        >
          <SectionHeading number="07" title="Cloud Execution Report" />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Prediction ID" value={`#${result.prediction_id}`} sub="Unique analysis identifier" />
                <StatCard label="Processing Timestamp" value={displayTimestamp !== 'N/A' ? new Date(displayTimestamp).toLocaleString() : 'N/A'} sub="Time of analysis" />
                <StatCard label="Storage Status" value={result.audio_url ? 'Cloud Stored' : 'Local Only'} sub={result.audio_url ? 'Supabase Storage' : 'No audio persisted'} />
                <StatCard label="Data Source" value={transcript ? 'Voice Input' : text_input ? 'Text Input' : 'Unknown'} sub="Input modality" />
              </div>
            </div>

            {/* Pipeline Path */}
            <div>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4">Request Pipeline Path</p>
              <div className="space-y-0">
                {[
                  { label: 'Client', desc: 'Browser / Application', color: '#22c55e' },
                  { label: 'Frontend', desc: 'React + Vite (Vercel)', color: '#3b82f6' },
                  { label: 'Backend', desc: 'FastAPI (Render)', color: '#a855f7' },
                  { label: 'AI Pipeline', desc: 'Whisper → Keyword Classifier → XAI', color: '#f97316' },
                  { label: 'Database', desc: 'SQLite (emotion_logs + xai_results)', color: '#6b7280' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full mt-1.5 relative" style={{ backgroundColor: step.color }} />
                      {i < 4 && <div className="w-0.5 h-6 bg-border group-last:hidden" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      <p className="text-xs text-muted-foreground/60">{step.desc}</p>
                    </div>
                    {i < 4 && (
                      <div className="hidden sm:flex items-center self-center text-muted-foreground/20 ml-auto">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-border">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">Cloud Processing Summary</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The analysis request was received at the edge, routed through the FastAPI backend, processed by the AI inference pipeline,
              and the complete result (prediction + performance metrics + XAI explanation) was stored in the database.
              The entire cloud round-trip is transparent to the end user, with all processing confirmed under prediction ID <strong className="text-foreground">#{result.prediction_id}</strong>.
            </p>
          </div>
        </motion.section>

        {/* ============================================================ */}
        {/* SECTION 8: FINAL AI ASSESSMENT */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-6 sm:p-8"
        >
          <SectionHeading number="08" title="Final AI Assessment" />

          <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6 sm:p-8">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-5 rounded-full blur-3xl" style={{ background: primaryColor }} />

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                  <svg className="w-5 h-5" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">Executive Assessment</p>
                  <p className="text-sm font-semibold text-foreground">EmotiSense AI — Emotion Analysis Report</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  The EmotiSense system analyzed the provided{' '}
                  {transcript ? `voice recording containing ${wordCount} words` : `text input "${(text_input || '').substring(0, 80)}${(text_input || '').length > 80 ? '...' : ''}"`}
                  {' '}and identified <strong className="text-foreground capitalize" style={{ color: primaryColor }}>{emotion}</strong> as the primary emotional state
                  with a confidence score of <strong className="text-foreground">{(confidence * 100).toFixed(1)}%</strong>.
                </p>

                <p>
                  The emotion classification is driven primarily by
                  {' '}{xai ? (xai.modality_contributions.text > xai.modality_contributions.audio ? 'textual content' : 'acoustic features') : 'the available input data'}.
                  {xai && topKeywords.length > 0 && (
                    <> Key contributing terms include: <strong className="text-foreground">{topKeywords.slice(0, 5).map(t => `"${t.token}"`).join(', ')}</strong>.</>
                  )}
                </p>

                {xai && (
                  <p>
                    The classifier shows{' '}
                    {xai.uncertainty.certainty === 'high' ? 'strong conviction in its prediction' :
                     xai.uncertainty.certainty === 'moderate' ? 'reasonable confidence with some ambiguity across classes' :
                     'notable uncertainty, suggesting the input may contain mixed emotional signals'}
                    {' '}(entropy: {xai.uncertainty.entropy.toFixed(3)}, normalized: {xai.uncertainty.normalized_entropy.toFixed(3)}).
                  </p>
                )}

                {xai?.audio_features && (
                  <p>
                    Acoustic analysis reveals {xai.audio_features.energy.level} energy levels,
                    {xai.audio_features.pitch.variation} pitch variation, and a {xai.audio_features.speech_rate.pace} speech rate,
                    which {emotion === 'happy' || emotion === 'excited' ? 'are consistent with positive emotional arousal.' :
                     emotion === 'sad' || emotion === 'frustrated' ? 'align with the detected emotional valence.' :
                     'provide context for the classification result.'}
                  </p>
                )}

                {performance && (
                  <p>
                    The AI pipeline processed the request in <strong className="text-foreground">{performance.total_latency_ms.toFixed(2)}ms</strong>,
                    utilizing <strong className="text-foreground">{performance.peak_memory_mb.toFixed(0)}MB</strong> of memory.
                    The system is operating at a throughput of <strong className="text-foreground">{performance.throughput_inferences_per_sec.toFixed(0)}</strong> inferences per second.
                  </p>
                )}

                {secondaryEmotion && (
                  <p>
                    A secondary {secondaryEmotion[0]} signal was detected at {(secondaryEmotion[1] * 100).toFixed(1)}% probability,
                    {secondaryEmotion[1] > 0.15 ? ' indicating a non-trivial secondary emotional component worth noting.' : ' though it is a minor component in the overall affective state.'}
                  </p>
                )}

                <p className="text-xs text-muted-foreground/40 pt-4 border-t border-border">
                  Assessment ID: #{result.prediction_id} &middot; Generated {new Date().toLocaleString()} &middot; EmotiSense v2.0
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Print footer */}
      <div className="hidden print:block text-center mt-8 pt-4 border-t border-gray-800">
        <p className="text-[10px] text-gray-500">EmotiSense — Multimodal Emotion Intelligence &middot; Assessment #{result.prediction_id}</p>
      </div>
    </div>
  );
}
