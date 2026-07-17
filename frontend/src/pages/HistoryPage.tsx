import { useEffect, useState, useCallback } from 'react';
import { getHistory } from '../api/client';
import type { HistoryItem } from '../types';
import DashboardSummaryCards from '../components/DashboardSummaryCards';
import EmotionDistributionChart from '../components/EmotionDistributionChart';
import HistoryTable from '../components/HistoryTable';

const ITEMS_PER_PAGE = 10;

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [emotionFilter, setEmotionFilter] = useState('');
  const [page, setPage] = useState(1);

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

  // Fetch all items (unpaginated) for summary stats + chart
  const [allItems, setAllItems] = useState<HistoryItem[]>([]);
  useEffect(() => {
    getHistory(9999, 0, '', '')
      .then((data) => setAllItems(data.items))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dashboard</p>
        <h1 className="text-[clamp(1.8rem,4vw,2.25rem)] font-semibold tracking-sub leading-tight mt-1 text-foreground">Result Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} total prediction{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Summary cards + emotion chart */}
      {!loading && !error && allItems.length > 0 && (
        <div className="mt-8 mb-8">
          <DashboardSummaryCards items={allItems} total={total} />
          <div className="mt-4">
            <EmotionDistributionChart items={allItems} />
          </div>
        </div>
      )}

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
        <HistoryTable
          items={items}
          search={search}
          emotionFilter={emotionFilter}
          total={total}
          page={page}
          totalPages={totalPages}
          onSearchChange={setSearch}
          onEmotionChange={setEmotionFilter}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
