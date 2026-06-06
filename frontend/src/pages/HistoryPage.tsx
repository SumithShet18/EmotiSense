import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { getHistory } from '../api/client';
import { HistoryItem } from '../types';

const emotionIcons: Record<string, string> = {
  angry: '😡', happy: '😊', sad: '😢',
  neutral: '😐', excited: '🤩', frustrated: '😤',
};

const emotionColors: Record<string, string> = {
  angry: '#ef4444', happy: '#22c55e', sad: '#3b82f6',
  neutral: '#6b7280', excited: '#a855f7', frustrated: '#f97316',
};

const EMOTIONS = ['angry', 'happy', 'sad', 'neutral', 'excited', 'frustrated'];
const ITEMS_PER_PAGE = 10;

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [emotionFilter, setEmotionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [playingId, setPlayingId] = useState<string | number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchPage = useCallback(async (pageNum: number, q: string, em: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistory(ITEMS_PER_PAGE, (pageNum - 1) * ITEMS_PER_PAGE, q, em);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(page, search, emotionFilter);
  }, [page, search, emotionFilter, fetchPage]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const handlePlay = (item: HistoryItem) => {
    if (playingId === item.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (item.audio_url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const audio = new Audio(item.audio_url);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audio.play().catch(() => setPlayingId(null));
      audioRef.current = audio;
      setPlayingId(item.id);
    }
  };

  return (
    <div>
      <div className="mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dashboard</p>
        <h1 className="text-[clamp(1.8rem,4vw,2.25rem)] font-semibold tracking-sub leading-tight mt-1 text-foreground">Result Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} total prediction{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-8 mb-6">
        <div className="relative flex-1 max-w-sm">
          <label htmlFor="search-input" className="sr-only">Search transcripts</label>
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            id="search-input"
            type="text"
            placeholder="Search transcripts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field !pl-10"
          />
        </div>
        <label htmlFor="emotion-filter" className="sr-only">Filter by emotion</label>
        <select
          id="emotion-filter"
          value={emotionFilter}
          onChange={(e) => { setEmotionFilter(e.target.value); setPage(1); }}
          className="input-field w-full sm:w-40"
        >
          <option value="">All emotions</option>
          {EMOTIONS.map((e) => (
            <option key={e} value={e} className="bg-background capitalize">{e}</option>
          ))}
        </select>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {total} result{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Loading */}
      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-3.5 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-muted-foreground">No predictions found.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground/60 uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Emotion</th>
                    <th className="px-6 py-4 font-medium">Confidence</th>
                    <th className="px-6 py-4 font-medium hidden md:table-cell">Transcript Preview</th>
                    <th className="px-6 py-4 font-medium w-16">Audio</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{emotionIcons[item.emotion.toLowerCase()] || '🧠'}</span>
                          <span className="capitalize font-medium text-foreground">{item.emotion}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-20 h-2 bg-white/5 rounded-pill overflow-hidden">
                            <div
                              className="h-full rounded-pill"
                              style={{
                                width: `${(item.confidence * 100).toFixed(0)}%`,
                                backgroundColor: emotionColors[item.emotion.toLowerCase()] || '#bf83fc',
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-foreground">{(item.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-[220px] truncate hidden md:table-cell">
                        {item.text_input || '\u2014'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.audio_url ? (
                          <button
                            onClick={() => handlePlay(item)}
                            className="text-lg hover:scale-110 transition-transform"
                            title={playingId === item.id ? 'Stop' : 'Play audio'}
                          >
                            {playingId === item.id ? '⏹' : '🎤'}
                          </button>
                        ) : (
                          <span className="text-muted-foreground/40">\u2014</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
