import type { HistoryItem } from '../types';

const emotionColors: Record<string, string> = {
  angry: '#ef4444', happy: '#22c55e', sad: '#3b82f6',
  neutral: '#6b7280', frustrated: '#f97316',
};

function todayCount(items: HistoryItem[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000;
  return items.filter((i) => {
    const t = new Date(i.timestamp).getTime();
    return t >= start && t < end;
  }).length;
}

function topEmotion(items: HistoryItem[]): { label: string; count: number; color: string } {
  const counts: Record<string, number> = {};
  for (const i of items) {
    const e = i.emotion.toLowerCase();
    counts[e] = (counts[e] || 0) + 1;
  }
  let best = '';
  let bestCount = 0;
  for (const [e, c] of Object.entries(counts)) {
    if (c > bestCount) { best = e; bestCount = c; }
  }
  return { label: best, count: bestCount, color: emotionColors[best] || '#bf83fc' };
}

function avgConfidence(items: HistoryItem[]): number {
  if (!items.length) return 0;
  return items.reduce((s, i) => s + i.confidence, 0) / items.length;
}

export default function DashboardSummaryCards({ items, total }: { items: HistoryItem[]; total: number }) {
  const avg = avgConfidence(items);
  const top = topEmotion(items);
  const today = todayCount(items);

  const cards = [
    { label: 'Total Predictions', value: String(total), color: '#bf83fc' },
    { label: 'Avg Confidence', value: `${(avg * 100).toFixed(1)}%`, color: '#22c55e' },
    { label: 'Top Emotion', value: top.label, sub: `${top.count} predictions`, color: top.color },
    { label: 'Predictions Today', value: String(today), color: '#f59e0b' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-5">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{c.label}</span>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-semibold tracking-tight text-foreground" style={{ color: c.color }}>
              {c.value}
            </span>
          </div>
          {c.sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}
