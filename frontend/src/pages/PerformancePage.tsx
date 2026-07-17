import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import { getPerformance } from '../api/client';
import type { PerformanceLog, PerformanceSummary } from '../types';
import OverallPerformanceChart from '../components/OverallPerformanceChart';
import F1BreakdownChart from '../components/F1BreakdownChart';
import ConfusionMatrixGrid from '../components/ConfusionMatrixGrid';
import ModelComparisonTable from '../components/ModelComparisonTable';

const COLORS = ['#bf83fc', '#6a9afb', '#f76ec9', '#22c55e', '#f59e0b', '#ef4444'];
const componentOrder = [
  'Whisper Transcription', 'Audio Preprocessing', 'Text Tokenization',
  'Fine-Tuned Encoders + Cross-Modal Fusion',
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
  if (latencyMs < 3000) return { label: 'Near Real-Time', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  if (latencyMs < 10000) return { label: 'Batch Optimized', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' };
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
      <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
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

function MetricCard({ label, value, unit, status, }: { label: string; value: string; unit: string; status?: { label: string; color: string; bg: string } }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {status && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ color: status.color, backgroundColor: status.bg }}>
            {status.label}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold text-foreground tracking-tight">{value}</span>
        <span className="text-[11px] text-muted-foreground">{unit}</span>
      </div>
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

  const deployClass = useMemo(() => classifyDeployment(totalLatency), [totalLatency]);

  const slowestStage = useMemo(() => {
    if (!chartData.length) return null;
    return chartData.reduce((a, b) => (a.latency_ms > b.latency_ms ? a : b));
  }, [chartData]);

  const assessment = useMemo(() => {
    const stageNote = slowestStage
      ? ` Profiling indicates the ${slowestStage.component} stage contributes the largest proportion of latency (${slowestStage.latency_ms.toFixed(0)} ms), while classification and fusion layers execute efficiently.`
      : '';
    return `The multimodal inference pipeline completed in ${totalLatency.toFixed(2)} ms with a peak memory footprint of ${peakMem.toFixed(0)} MB and estimated energy consumption of ${totalEnergy.toFixed(4)} Joules.${stageNote} Current measurements suggest suitability for ${deployClass.label.toLowerCase()} inference workloads.`;
  }, [totalLatency, peakMem, totalEnergy, deployClass, slowestStage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-3.5 rounded-xl text-sm max-w-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Performance</p>
        <h1 className="text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-tight mt-1 text-foreground">
          Inference Pipeline Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time benchmarking and resource utilization across multimodal emotion inference components.
        </p>
      </motion.div>

      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">Model Architecture Comparison</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
        </div>
        <p className="text-sm text-muted-foreground -mt-3">
          Static results from development: four architectures evaluated on the same
          held-out IEMOCAP test session (Session 5, never used in training).
          This reflects model validation — not per-request prediction performance.
        </p>
        <motion.div {...fadeUp}>
          <ModelComparisonTable />
        </motion.div>
        <motion.div {...fadeUp}>
          <OverallPerformanceChart />
        </motion.div>
        <motion.div {...fadeUp}>
          <F1BreakdownChart />
        </motion.div>
        <motion.div {...fadeUp}>
          <ConfusionMatrixGrid />
        </motion.div>
      </div>

      <motion.div {...fadeUp}>
        <SectionTitle title="Key Metrics" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard label="Total Latency" value={totalLatency.toFixed(0)} unit="ms" status={{ label: totalLatency < 500 ? 'Low' : totalLatency < 3000 ? 'Moderate' : 'High', color: totalLatency < 500 ? '#22c55e' : totalLatency < 3000 ? '#f59e0b' : '#ef4444', bg: totalLatency < 500 ? 'rgba(34,197,94,0.12)' : totalLatency < 3000 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)' }} />
          <MetricCard label="Energy Consumption" value={totalEnergy.toFixed(4)} unit="J" status={{ label: totalEnergy < 10 ? 'Low' : totalEnergy < 100 ? 'Moderate' : 'High', color: totalEnergy < 10 ? '#22c55e' : totalEnergy < 100 ? '#f59e0b' : '#ef4444', bg: totalEnergy < 10 ? 'rgba(34,197,94,0.12)' : totalEnergy < 100 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)' }} />
          <MetricCard label="Peak Memory" value={peakMem.toFixed(0)} unit="MB" status={{ label: peakMem < 2000 ? 'Normal' : 'High', color: peakMem < 2000 ? '#22c55e' : '#f59e0b', bg: peakMem < 2000 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)' }} />
          <MetricCard label="CPU Utilization" value={avgCpu.toFixed(1)} unit="%" status={{ label: avgCpu < 50 ? 'Normal' : avgCpu < 80 ? 'Elevated' : 'High', color: avgCpu < 50 ? '#22c55e' : avgCpu < 80 ? '#f59e0b' : '#ef4444', bg: avgCpu < 50 ? 'rgba(34,197,94,0.12)' : avgCpu < 80 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)' }} />
          <MetricCard label="Throughput" value={throughput.toFixed(2)} unit="inf/s" status={{ label: throughput > 1 ? 'Adequate' : 'Limited', color: throughput > 1 ? '#22c55e' : '#f59e0b', bg: throughput > 1 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)' }} />
        </div>
      </motion.div>

      <motion.div {...fadeUp}>
        <SectionTitle title="Deployment Classification" />
        <div className="card p-5 flex flex-wrap items-center gap-4">
          <StatusBadge label={deployClass.label} color={deployClass.color} bg={deployClass.bg} />
          <span className="text-sm text-muted-foreground">
            Based on total inference latency of <span className="text-foreground font-medium">{totalLatency.toFixed(0)} ms</span>
          </span>
        </div>
      </motion.div>

      <motion.div {...fadeUp}>
        <SectionTitle title="Inference Pipeline Breakdown" />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-muted-foreground/60 uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Component</th>
                  <th className="px-6 py-4 font-medium">Latency</th>
                  <th className="px-6 py-4 font-medium">Memory</th>
                  <th className="px-6 py-4 font-medium">CPU</th>
                  <th className="px-6 py-4 font-medium">Energy</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, i) => (
                  <tr key={row.component} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-foreground font-medium">{row.component}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{row.latency_ms.toFixed(2)} ms</td>
                    <td className="px-6 py-4 text-muted-foreground">{row.memory_mb.toFixed(1)} MB</td>
                    <td className="px-6 py-4 text-muted-foreground">{row.cpu_usage.toFixed(1)}%</td>
                    <td className="px-6 py-4 text-muted-foreground">{row.energy_joules.toFixed(4)} J</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp}>
        <SectionTitle title="Sequential Execution Timeline" />
        <div className="card p-6">
          <div className="space-y-3">
            {chartData.map((d, i) => {
              const pct = totalLatency > 0 ? (d.latency_ms / totalLatency) * 100 : 0;
              const offset = chartData.slice(0, i).reduce((s, row) => s + row.latency_ms, 0);
              const offsetPct = totalLatency > 0 ? (offset / totalLatency) * 100 : 0;
              return (
                <div key={d.component} className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-36 text-right shrink-0 leading-tight">{d.component}</span>
                  <div className="flex-1 h-7 bg-white/[0.04] rounded-md relative overflow-hidden">
                    <div className="h-full rounded-md absolute top-0 left-0 flex items-center px-2.5 text-[10px] font-medium text-white"
                      style={{ width: `${Math.max(pct, 1.5)}%`, marginLeft: `${offsetPct}%`, backgroundColor: COLORS[i % COLORS.length] }}>
                      {d.latency_ms.toFixed(2)}ms
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp}>
        <SectionTitle title="Stage-Level Resource Utilization" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'latency_ms' as const, label: 'Latency by Component (ms)', colorOffset: 0 },
            { key: 'energy_joules' as const, label: 'Energy Consumption by Component (J)', colorOffset: 2 },
            { key: 'memory_mb' as const, label: 'Memory Usage by Component (MB)', colorOffset: 3 },
            { key: 'cpu_usage' as const, label: 'CPU Utilization by Component (%)', colorOffset: 4, domain: [0, 100] as [number, number] },
          ].map((chart) => (
            <div key={chart.key} className="card p-5">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">{chart.label}</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" domain={chart.domain} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis dataKey="component" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #24243a', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#f0f0f7' }} />
                  <Bar dataKey={chart.key} radius={[0, 3, 3, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + chart.colorOffset) % COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div {...fadeUp}>
        <SectionTitle title="Performance Assessment" />
        <div className="card p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{assessment}</p>
        </div>
      </motion.div>
    </div>
  );
}
