import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { f1ByClass, EMOTION_LABELS_MAP } from '../data/modelComparison';

const configColors: Record<string, string> = {
  "Text-Only": "#bf83fc",
  "Audio-Only": "#3b82f6",
  "Fusion (Both)": "#f59e0b",
  "Fine-Tuned Model": "#22c55e",
};

const chartData = f1ByClass.map((d) => ({
  emotion: EMOTION_LABELS_MAP[d.emotion] || d.emotion,
  "Text-Only": +(d["Text-Only"] * 100).toFixed(1),
  "Audio-Only": +(d["Audio-Only"] * 100).toFixed(1),
  "Fusion (Both)": +(d["Fusion (Both)"] * 100).toFixed(1),
  "Fine-Tuned Model": +(d["Fine-Tuned Model"] * 100).toFixed(1),
}));

export default function F1BreakdownChart() {
  return (
    <div className="card p-6">
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Per-Class F1 Score Breakdown
      </h3>
      <p className="text-xs text-muted-foreground/60 mb-4">
        F1 score (%) per emotion class across model configurations
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="emotion" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #24243a', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#f0f0f7' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          {(["Text-Only", "Audio-Only", "Fusion (Both)", "Fine-Tuned Model"] as const).map((cfg) => (
            <Bar key={cfg} dataKey={cfg} fill={configColors[cfg]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
