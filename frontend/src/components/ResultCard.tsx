import { motion } from 'framer-motion';

interface ResultCardProps {
  emotion: string;
  confidence: number;
  probabilities: Record<string, number>;
  timestamp?: string;
  textInput?: string | null;
  transcript?: string | null;
  audioUrl?: string | null;
}

const emotionMeta: Record<string, { icon: string; color: string; label: string; hsl: string }> = {
  angry: { icon: '😡', color: '#ef4444', label: 'Angry', hsl: '0, 84%, 60%' },
  happy: { icon: '😊', color: '#22c55e', label: 'Happy', hsl: '142, 76%, 45%' },
  sad: { icon: '😢', color: '#3b82f6', label: 'Sad', hsl: '220, 80%, 60%' },
  neutral: { icon: '😐', color: '#6b7280', label: 'Neutral', hsl: '220, 10%, 60%' },
  excited: { icon: '🤩', color: '#a855f7', label: 'Excited', hsl: '270, 90%, 65%' },
  frustrated: { icon: '😤', color: '#f97316', label: 'Frustrated', hsl: '20, 90%, 60%' },
};

function AnalysisSummary({ emotion, confidence, transcript }: { emotion: string; confidence: number; transcript?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground mb-1">AI Analysis Summary</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Whisper transcribed your speech, MentalBERT analyzed the semantic meaning of your words,
          and HuBERT extracted acoustic features such as prosody, pitch and tone.
          A cross-modal attention fusion layer combined both signals and predicted{' '}
          <span className="text-foreground font-medium capitalize">{emotion}</span> ({Math.round(confidence * 100)}%)
          as your dominant emotional state.
        </p>
      </div>
    </div>
  );
}

export default function ResultCard({ emotion, confidence, probabilities, timestamp, textInput, transcript, audioUrl }: ResultCardProps) {
  const normalized = emotion.toLowerCase();
  const meta = emotionMeta[normalized] || { icon: '🧠', color: '#6b7280', label: emotion, hsl: '0, 0%, 60%' };
  const sorted = Object.entries(probabilities).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      {/* Transcript */}
      {transcript && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Generated Transcript</span>
            <span className="tag text-[10px]">Whisper</span>
          </div>
          <p className="text-base text-foreground leading-relaxed border-l-2 border-white/20 pl-4">
            &ldquo;{transcript}&rdquo;
          </p>
        </div>
      )}

      {/* Emotion hero */}
      <div className="card p-6">
        <div className="flex items-center gap-6">
          <span className="text-5xl">{meta.icon}</span>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Detected Emotion</p>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-semibold tracking-heading leading-tight capitalize mt-0.5 text-foreground">{emotion}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{(confidence * 100).toFixed(1)}% confidence — {(probabilities[emotion.toLowerCase()] || 0) > 0.5 ? 'primary emotion significantly above baseline.' : 'distributed across multiple emotional states.'}</p>
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-4xl font-semibold tracking-display text-foreground">{Math.round(confidence * 100)}%</div>
          <p className="text-xs text-muted-foreground mt-0.5">Confidence</p>
        </div>
      </div>

      {/* Emotion Probabilities */}
      <div className="card p-6">
        <p className="text-sm font-medium text-foreground mb-4">Emotion Probabilities</p>
        <div className="space-y-2.5">
          {sorted.map(([label, prob], i) => {
            const pct = Math.round(prob * 100);
            const isTop = i === 0;
            const emo = emotionMeta[label.toLowerCase()] || { icon: '🧠', color: '#6b7280', label, hsl: '0, 0%, 60%' };
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <span className="text-base">{emo.icon}</span>
                    <span className="text-foreground font-medium capitalize">{label}</span>
                    {isTop && <span className="tag text-[10px]" style={{ backgroundColor: `${emo.color}20`, color: emo.color, border: `1px solid ${emo.color}40` }}>Top</span>}
                  </span>
                  <span className="font-semibold text-foreground">{pct}%</span>
                </div>
                <div className="emotion-bar">
                  <motion.div
                    className="emotion-bar-fill"
                    style={{ backgroundColor: emo.color, '--emotion-hsl': emo.hsl } as React.CSSProperties}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI Analysis */}
      <div className="card p-6">
        <AnalysisSummary emotion={emotion} confidence={confidence} transcript={transcript} />
      </div>

      {/* Audio + Timestamp */}
      {(audioUrl || timestamp) && (
        <div className="card p-6 space-y-4">
          {audioUrl && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Voice Recording</p>
              <p className="text-sm text-muted-foreground mb-2">voice_sample.wav</p>
              <audio controls src={audioUrl} className="w-full rounded-xl [&::-webkit-media-controls-panel]:bg-background" />
            </div>
          )}
          {timestamp && (
            <p className="text-xs text-muted-foreground/60">
              {new Date(timestamp).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
