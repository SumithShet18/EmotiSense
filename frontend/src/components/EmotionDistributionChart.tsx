import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { HistoryItem } from '../types';

const emotionColors: Record<string, string> = {
  angry: '#ef4444', happy: '#22c55e', sad: '#3b82f6',
  neutral: '#6b7280', frustrated: '#f97316',
};
const EMOTION_ORDER = ['angry', 'happy', 'sad', 'neutral', 'frustrated'];

export default function EmotionDistributionChart({ items }: { items: HistoryItem[] }) {
  const counts: Record<string, number> = {};
  for (const i of items) {
    const e = i.emotion.toLowerCase();
    counts[e] = (counts[e] || 0) + 1;
  }
  const total = items.length || 1;
  const data = EMOTION_ORDER.filter((e) => counts[e]).map((e) => ({
    name: e,
    value: counts[e],
    pct: ((counts[e] / total) * 100).toFixed(1),
  }));

  if (!data.length) return null;

  return (
    <div className="card p-5">
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Emotion Distribution
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={emotionColors[entry.name] || '#bf83fc'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #24243a', borderRadius: 8, fontSize: 12 }}
            formatter={(_: any, name: string) => [`${counts[name]} (${data.find(d => d.name === name)?.pct}%)`, name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            formatter={(value: string) => (
              <span className="capitalize">{value} ({data.find(d => d.name === value)?.pct}%)</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
