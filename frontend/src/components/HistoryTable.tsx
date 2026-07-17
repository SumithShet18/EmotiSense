import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { HistoryItem } from '../types';

const emotionColors: Record<string, string> = {
  angry: '#ef4444', happy: '#22c55e', sad: '#3b82f6',
  neutral: '#6b7280', frustrated: '#f97316',
};
const EMOTION_ORDER = ['angry', 'happy', 'sad', 'neutral', 'frustrated'];
const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#6b7280', '#f97316'];

export default function HistoryTable({
  items,
  search,
  emotionFilter,
  total,
  page,
  totalPages,
  onSearchChange,
  onEmotionChange,
  onPageChange,
}: {
  items: HistoryItem[];
  search: string;
  emotionFilter: string;
  total: number;
  page: number;
  totalPages: number;
  onSearchChange: (v: string) => void;
  onEmotionChange: (v: string) => void;
  onPageChange: (p: number) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const navigate = useNavigate();

  const toggleExpand = (id: string | number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <label htmlFor="search-input-dash" className="sr-only">Search transcripts</label>
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            id="search-input-dash"
            type="text"
            placeholder="Search transcripts..."
            value={search}
            onChange={(e) => { onSearchChange(e.target.value); onPageChange(1); }}
            className="input-field !pl-10"
          />
        </div>
        <label htmlFor="emotion-filter-dash" className="sr-only">Filter by emotion</label>
        <select
          id="emotion-filter-dash"
          value={emotionFilter}
          onChange={(e) => { onEmotionChange(e.target.value); onPageChange(1); }}
          className="input-field w-full sm:w-40"
        >
          <option value="">All emotions</option>
          {EMOTION_ORDER.map((e) => (
            <option key={e} value={e} className="bg-background capitalize">{e}</option>
          ))}
        </select>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {total} result{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] text-muted-foreground/60 uppercase tracking-wider">
                <th className="px-5 py-3.5 font-medium">Date & Time</th>
                <th className="px-5 py-3.5 font-medium">Emotion</th>
                <th className="px-5 py-3.5 font-medium">Confidence</th>
                <th className="px-5 py-3.5 font-medium hidden md:table-cell">Transcript</th>
                <th className="px-5 py-3.5 font-medium w-12" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => toggleExpand(item.id)}
                >
                  <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap text-xs">
                    {new Date(item.timestamp).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{emotionIcons[item.emotion.toLowerCase()] || '🧠'}</span>
                      <span className="capitalize font-medium text-foreground">{item.emotion}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-28 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(item.confidence * 100).toFixed(0)}%`,
                            backgroundColor: emotionColors[item.emotion.toLowerCase()] || '#bf83fc',
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground">{(item.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground max-w-[200px] truncate hidden md:table-cell text-xs">
                    {item.text_input || '\u2014'}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/explain'); }}
                      className="text-muted-foreground/50 hover:text-foreground transition-colors text-sm"
                      title="View explanation"
                    >
                      →
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded probability breakdown */}
      {expandedId !== null && (
        <div className="card p-5 mt-1">
          {(() => {
            const item = items.find((i) => i.id === expandedId);
            if (!item || !item.probabilities) return null;
            const probs = EMOTION_ORDER.map((e) => ({
              emotion: e,
              prob: item.probabilities![e] || 0,
            })).sort((a, b) => b.prob - a.prob);
            return (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Probability Distribution</p>
                {probs.map((p) => (
                  <div key={p.emotion} className="flex items-center gap-3">
                    <span className="text-xs capitalize text-foreground font-medium w-20 text-right">{p.emotion}</span>
                    <div className="flex-1 h-4 bg-white/[0.04] rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{
                          width: `${p.prob * 100}%`,
                          backgroundColor: emotionColors[p.emotion] || '#bf83fc',
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-12 text-right">{(p.prob * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="btn-ghost text-xs disabled:opacity-30"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="btn-ghost text-xs disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

const emotionIcons: Record<string, string> = {
  angry: '😡', happy: '😊', sad: '😢',
  neutral: '😐', frustrated: '😤',
};
