import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { overallPerformance } from '../data/modelComparison';

const configColors: Record<string, string> = {
  "Text-Only": "#bf83fc",
  "Audio-Only": "#3b82f6",
  "Fusion (Both)": "#f59e0b",
  "Fine-Tuned Model": "#22c55e",
};

const chartData = overallPerformance.map((d) => ({
  config: d.config,
  "Accuracy (%)": d.accuracy,
  "Macro F1 (%)": d.macroF1,
}));

export default function OverallPerformanceChart() {
  return (
    <div className="card p-6">
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Accuracy & Macro F1 by Model Configuration
      </h3>
      <p className="text-xs text-muted-foreground/60 mb-4">
        Evaluated on IEMOCAP held-out test session (Session 5)
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="config" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #24243a', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#f0f0f7' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Bar dataKey="Accuracy (%)" fill="#bf83fc" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Macro F1 (%)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
