import { overallPerformance, f1ByClass, EMOTION_LABELS_MAP, MODEL_CONFIGS } from '../data/modelComparison';

const configColors: Record<string, string> = {
  "Text-Only": "#bf83fc",
  "Audio-Only": "#3b82f6",
  "Fusion (Both)": "#f59e0b",
  "Fine-Tuned Model": "#22c55e",
};

export default function ModelComparisonTable() {
  return (
    <div className="space-y-8">
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] text-muted-foreground/60 uppercase tracking-wider">
                <th className="px-5 py-3.5 font-medium">Model Configuration</th>
                <th className="px-5 py-3.5 font-medium text-right">Accuracy (%)</th>
                <th className="px-5 py-3.5 font-medium text-right">Macro F1 (%)</th>
              </tr>
            </thead>
            <tbody>
              {overallPerformance.map((row) => (
                <tr key={row.config} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: configColors[row.config] }} />
                      <span className="text-foreground font-medium">{row.config}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">{row.accuracy.toFixed(2)}%</td>
                  <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">{row.macroF1.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] text-muted-foreground/60 uppercase tracking-wider">
                <th className="px-5 py-3.5 font-medium">Emotion</th>
                {MODEL_CONFIGS.map((cfg) => (
                  <th key={cfg} className="px-5 py-3.5 font-medium text-right">{cfg}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {f1ByClass.map((row) => (
                <tr key={row.emotion} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#bf83fc' }} />
                      <span className="text-foreground font-medium">{EMOTION_LABELS_MAP[row.emotion] || row.emotion}</span>
                    </span>
                  </td>
                  {MODEL_CONFIGS.map((cfg) => (
                    <td key={cfg} className="px-5 py-3.5 text-right font-mono text-muted-foreground">
                      {(row[cfg] * 100).toFixed(1)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
