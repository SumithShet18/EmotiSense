import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import { getPerformance } from '../api/client';
import type { PerformanceLog, PerformanceSummary } from '../types';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];
const componentOrder = [
  'Whisper Transcription', 'MentalBERT Inference', 'HuBERT Inference',
  'Cross-Modal Attention Fusion', 'Emotion Classification',
];

function aggregateByComponent(logs: PerformanceLog[]) {
  const map = new Map<string, { latency: number[]; cpu: number[]; mem: number[]; energy: number[] }>();
  for (const log of logs) {
    if (!map.has(log.component)) map.set(log.component, { latency: [], cpu: [], mem: [], energy: [] });
    const entry = map.get(log.component)!;
    entry.latency.push(log.latency_ms);
    entry.cpu.push(log.cpu_usage);
    entry.mem.push(log.memory_mb);
    entry.energy.push(log.energy_joules);
  }
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return componentOrder
    .filter((c) => map.has(c))
    .map((component) => {
      const d = map.get(component)!;
      return {
        component,
        latency_ms: Math.round(avg(d.latency) * 100) / 100,
        cpu_usage: Math.round(avg(d.cpu) * 100) / 100,
        memory_mb: Math.round(avg(d.mem) * 100) / 100,
        energy_joules: Math.round(avg(d.energy) * 10000) / 10000,
      };
    });
}

function classifyDeployment(latencyMs: number): { label: string; color: string; bg: string } {
  if (latencyMs < 500) return { label: 'Production Ready', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
  if (latencyMs < 3000) return { label: 'Near Real-Time Ready', color: '#eab308', bg: 'rgba(234,179,8,0.12)' };
  if (latencyMs < 10000) return { label: 'Batch Processing Optimized', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' };
  return { label: 'Experimental', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
}

type StageRow = { component: string; latency_ms: number; cpu_usage: number; memory_mb: number; energy_joules: number };

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  viewport: { once: true, margin: '-20px' },
};

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-sm font-semibold text-gray-100 tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-[#1e1e32]" />
    </div>
  );
}

function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium tracking-wide"
      style={{ color, backgroundColor: bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function TrendIndicator({ value, good, unit }: { value: number; good: 'up' | 'down'; unit?: string }) {
  const isFavorable = good === 'down' ? value < 1000 : value > 10;
  const color = isFavorable ? '#22c55e' : '#ef4444';
  const arrow = isFavorable ? (good === 'down' ? '↓' : '↑') : (good === 'down' ? '↑' : '↓');
  return (
    <span className="text-[11px] font-medium" style={{ color }}>
      {arrow} {value.toFixed(0)}{unit || ''}
    </span>
  );
}

function MetricCard({
  label, value, unit, status, trend, trendLabel,
}: {
  label: string; value: string; unit: string;
  status?: { label: string; color: string; bg: string };
  trend?: { value: number; good: 'up' | 'down'; unit?: string };
  trendLabel?: string;
}) {
  return (
    <div className="bg-[#12122a] border border-[#1e1e32] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        {status && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded"
            style={{ color: status.color, backgroundColor: status.bg }}
          >
            {status.label}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold text-gray-100 tracking-tight">{value}</span>
        <span className="text-[11px] text-gray-500">{unit}</span>
      </div>
      {trend && (
        <div className="flex items-center gap-1.5 mt-2">
          <TrendIndicator value={trend.value} good={trend.good} unit={trend.unit} />
          {trendLabel && <span className="text-[10px] text-gray-600">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

export default function PerformancePage() {
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestSummary, setLatestSummary] = useState<PerformanceSummary | null>(null);

  useEffect(() => {
    getPerformance()
      .then((data) => {
        setLogs(data.items);
        const ids = [...new Set(data.items.map((l) => l.prediction_id))];
        if (ids.length > 0) {
          const latestId = ids[0];
          const latestLogs = data.items.filter((l) => l.prediction_id === latestId);
          const stages = aggregateByComponent(latestLogs);
          const totalLatency = stages.reduce((s, st) => s + st.latency_ms, 0);
          const totalEnergy = stages.reduce((s, st) => s + st.energy_joules, 0);
          const peakMem = Math.max(...stages.map((st) => st.memory_mb));
          const avgCpu = stages.reduce((s, st) => s + st.cpu_usage, 0) / stages.length;
          setLatestSummary({
            stages,
            total_latency_ms: Math.round(totalLatency * 100) / 100,
            total_energy_joules: Math.round(totalEnergy * 10000) / 10000,
            peak_memory_mb: Math.round(peakMem * 100) / 100,
            avg_cpu_usage: Math.round(avgCpu * 100) / 100,
            throughput_inferences_per_sec: Math.round(1000 / totalLatency * 100) / 100,
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const chartData: StageRow[] = latestSummary?.stages || aggregateByComponent(logs);
  const summary = latestSummary;

  const totalLatency = useMemo(() => chartData.reduce((s, d) => s + d.latency_ms, 0), [chartData]);
  const totalEnergy = useMemo(() => chartData.reduce((s, d) => s + d.energy_joules, 0), [chartData]);
  const peakMem = useMemo(() => Math.max(...chartData.map((d) => d.memory_mb)), [chartData]);
  const avgCpu = useMemo(() => chartData.reduce((s, d) => s + d.cpu_usage, 0) / chartData.length, [chartData]);
  const throughput = useMemo(() => totalLatency > 0 ? Math.round(1000 / totalLatency * 100) / 100 : 0, [totalLatency]);
  const avgStageTime = chartData.length > 0 ? totalLatency / chartData.length : 0;

  const deployClass = useMemo(() => classifyDeployment(totalLatency), [totalLatency]);

  const slowestStage = useMemo(() => {
    if (!chartData.length) return null;
    return chartData.reduce((a, b) => (a.latency_ms > b.latency_ms ? a : b));
  }, [chartData]);

  const assessment = useMemo(() => {
    const stageNote = slowestStage
      ? ` Profiling indicates the ${slowestStage.component} stage contributes the largest proportion of latency (${slowestStage.latency_ms.toFixed(0)} ms), while classification and fusion layers execute efficiently.`
      : '';
    return `The multimodal inference pipeline completed in ${totalLatency.toFixed(2)} seconds with a peak memory footprint of ${peakMem.toFixed(0)} MB and estimated energy consumption of ${totalEnergy.toFixed(2)} Joules.${stageNote} Current measurements suggest suitability for ${deployClass.label.toLowerCase()} inference workloads.`;
  }, [totalLatency, peakMem, totalEnergy, deployClass, slowestStage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 bg-[#0b0b1a] min-h-screen">
        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0b1a] flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-800/30 text-red-400 px-4 py-3 rounded-lg text-sm max-w-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b1a] text-gray-100 pb-16">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ===== Header ===== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] font-medium text-indigo-400 uppercase tracking-widest mb-2">
            <span>EMOTISENSE</span>
            <span className="text-gray-600">/</span>
            <span>AI Performance Intelligence</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-100">Inference Pipeline Analytics</h1>
          <p className="text-sm text-gray-500 mt-1.5">Real-time benchmarking and resource utilization analysis across multimodal emotion inference components.</p>
        </div>

        {/* ===== Key Metrics ===== */}
        <motion.div {...fadeUp}>
          <SectionTitle title="Key Metrics" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard
              label="Total Latency"
              value={totalLatency.toFixed(0)}
              unit="ms"
              status={{
                label: totalLatency < 500 ? 'Low' : totalLatency < 3000 ? 'Moderate' : 'High',
                color: totalLatency < 500 ? '#22c55e' : totalLatency < 3000 ? '#eab308' : '#ef4444',
                bg: totalLatency < 500 ? 'rgba(34,197,94,0.12)' : totalLatency < 3000 ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)',
              }}
              trend={{ value: totalLatency, good: 'down', unit: 'ms' }}
              trendLabel="end-to-end"
            />
            <MetricCard
              label="Energy Consumption"
              value={totalEnergy.toFixed(2)}
              unit="J"
              status={{
                label: totalEnergy < 10 ? 'Low' : totalEnergy < 100 ? 'Moderate' : 'High',
                color: totalEnergy < 10 ? '#22c55e' : totalEnergy < 100 ? '#eab308' : '#ef4444',
                bg: totalEnergy < 10 ? 'rgba(34,197,94,0.12)' : totalEnergy < 100 ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)',
              }}
              trend={{ value: totalEnergy, good: 'down', unit: 'J' }}
            />
            <MetricCard
              label="Peak Memory"
              value={peakMem.toFixed(0)}
              unit="MB"
              status={{
                label: peakMem < 2000 ? 'Normal' : 'High',
                color: peakMem < 2000 ? '#22c55e' : '#eab308',
                bg: peakMem < 2000 ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
              }}
              trend={{ value: peakMem, good: 'down', unit: 'MB' }}
            />
            <MetricCard
              label="CPU Utilization"
              value={avgCpu.toFixed(1)}
              unit="%"
              status={{
                label: avgCpu < 50 ? 'Normal' : avgCpu < 80 ? 'Elevated' : 'High',
                color: avgCpu < 50 ? '#22c55e' : avgCpu < 80 ? '#eab308' : '#ef4444',
                bg: avgCpu < 50 ? 'rgba(34,197,94,0.12)' : avgCpu < 80 ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)',
              }}
              trend={{ value: avgCpu, good: 'down', unit: '%' }}
            />
            <MetricCard
              label="Throughput"
              value={throughput.toFixed(2)}
              unit="inf/s"
              status={{
                label: throughput > 1 ? 'Adequate' : 'Limited',
                color: throughput > 1 ? '#22c55e' : '#eab308',
                bg: throughput > 1 ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
              }}
              trend={{ value: throughput, good: 'up', unit: '' }}
              trendLabel="inferences/sec"
            />
          </div>
        </motion.div>

        {/* ===== Deployment Classification ===== */}
        <motion.div {...fadeUp} className="mt-10">
          <SectionTitle title="Deployment Classification" />
          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge label={deployClass.label} color={deployClass.color} bg={deployClass.bg} />
            <span className="text-sm text-gray-500">
              Based on total inference latency of <span className="text-gray-300 font-medium">{totalLatency.toFixed(0)} ms</span>
            </span>
          </div>
        </motion.div>

        {/* ===== Inference Pipeline Breakdown ===== */}
        <motion.div {...fadeUp} className="mt-10">
          <SectionTitle title="Inference Pipeline Breakdown" />
          <div className="bg-[#12122a] border border-[#1e1e32] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e32] text-left text-[11px] text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3 font-medium">Component</th>
                    <th className="px-5 py-3 font-medium">Latency</th>
                    <th className="px-5 py-3 font-medium">Memory</th>
                    <th className="px-5 py-3 font-medium">CPU</th>
                    <th className="px-5 py-3 font-medium">Energy</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, i) => (
                    <tr
                      key={row.component}
                      className="border-b border-[#1e1e32] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-gray-200">{row.component}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">{row.latency_ms.toFixed(1)} ms</td>
                      <td className="px-5 py-3 text-gray-400">{row.memory_mb.toFixed(1)} MB</td>
                      <td className="px-5 py-3 text-gray-400">{row.cpu_usage.toFixed(1)}%</td>
                      <td className="px-5 py-3 text-gray-400">{row.energy_joules.toFixed(3)} J</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* ===== Pipeline Waterfall ===== */}
        <motion.div {...fadeUp} className="mt-10">
          <SectionTitle title="Sequential Execution Timeline" />
          <div className="bg-[#12122a] border border-[#1e1e32] rounded-lg p-5">
            <div className="space-y-2.5">
              {chartData.map((d, i) => {
                const pct = totalLatency > 0 ? (d.latency_ms / totalLatency) * 100 : 0;
                const offset = chartData.slice(0, i).reduce((s, row) => s + row.latency_ms, 0);
                const offsetPct = totalLatency > 0 ? (offset / totalLatency) * 100 : 0;
                return (
                  <div key={d.component} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-36 text-right shrink-0">{d.component}</span>
                    <div className="flex-1 h-7 bg-[#0b0b1a] rounded-md relative overflow-hidden">
                      <div
                        className="h-full rounded-md absolute top-0 left-0 flex items-center px-2.5 text-[10px] font-medium text-white"
                        style={{
                          width: `${Math.max(pct, 1.5)}%`,
                          marginLeft: `${offsetPct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                          minWidth: pct > 12 ? 'fit-content' : undefined,
                        }}
                      >
                        {d.latency_ms.toFixed(0)}ms
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ===== Stage-Level Metrics ===== */}
        <motion.div {...fadeUp} className="mt-10">
          <SectionTitle title="Stage-Level Resource Utilization" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'latency_ms' as const, label: 'Latency by Component (ms)', colorOffset: 0 },
              { key: 'energy_joules' as const, label: 'Energy Consumption by Component (J)', colorOffset: 2 },
              { key: 'memory_mb' as const, label: 'Memory Usage by Component (MB)', colorOffset: 3 },
              { key: 'cpu_usage' as const, label: 'CPU Utilization by Component (%)', colorOffset: 4, domain: [0, 100] as [number, number] },
            ].map((chart) => (
              <div key={chart.key} className="bg-[#12122a] border border-[#1e1e32] rounded-lg p-5">
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">{chart.label}</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e32" />
                    <XAxis type="number" domain={chart.domain} tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis dataKey="component" type="category" tick={{ fill: '#9ca3af', fontSize: 10 }} width={90} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#12122a', border: '1px solid #1e1e32', borderRadius: 6, fontSize: 11 }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey={chart.key} radius={[0, 3, 3, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[(i + chart.colorOffset) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ===== Performance Assessment ===== */}
        <motion.div {...fadeUp} className="mt-10">
          <SectionTitle title="Performance Assessment" />
          <div className="bg-[#12122a] border border-[#1e1e32] rounded-lg p-5">
            <p className="text-sm text-gray-400 leading-relaxed">{assessment}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
