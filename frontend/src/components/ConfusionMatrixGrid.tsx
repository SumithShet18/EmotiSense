import { useState } from 'react';
import {
  confusionMatrices, MODEL_CONFIGS, EMOTION_CODES, EMOTION_LABELS_MAP,
} from '../data/modelComparison';

const configColors: Record<string, string> = {
  "Text-Only": "#bf83fc",
  "Audio-Only": "#3b82f6",
  "Fusion (Both)": "#f59e0b",
  "Fine-Tuned Model": "#22c55e",
};

export default function ConfusionMatrixGrid() {
  const [selected, setSelected] = useState<string>("Fine-Tuned Model");
  const matrix = confusionMatrices[selected];
  const accent = configColors[selected] || "#bf83fc";

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div>
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Confusion Matrix
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Row-normalized predictions (%) — diagonals show correct classification rate
          </p>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input-field !w-44 text-xs"
          style={{ borderColor: `${accent}44` }}
        >
          {MODEL_CONFIGS.map((cfg) => (
            <option key={cfg} value={cfg} className="bg-background">{cfg}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-2 text-right text-muted-foreground/60 font-medium">True ↓ / Pred →</th>
              {EMOTION_CODES.map((code) => (
                <th key={code} className="p-2 text-center text-muted-foreground/60 font-medium">
                  {EMOTION_LABELS_MAP[code]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="p-2 text-right text-muted-foreground font-medium whitespace-nowrap">
                  <span className="flex items-center justify-end gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                    {EMOTION_LABELS_MAP[EMOTION_CODES[rIdx]]}
                  </span>
                </td>
                {row.map((val, cIdx) => {
                  const isDiagonal = rIdx === cIdx;
                  return (
                    <td
                      key={cIdx}
                      className="p-2 text-center rounded-md font-mono text-xs border border-transparent"
                      style={{
                        backgroundColor: isDiagonal
                          ? `${accent}${Math.round(Math.min(val / 100, 1) * 60).toString(16).padStart(2, '0')}`
                          : `rgba(255,255,255,${Math.min(val / 200, 0.15)})`,
                        borderColor: isDiagonal ? `${accent}66` : 'transparent',
                        color: isDiagonal ? '#f0f0f7' : val > 20 ? '#e2e8f0' : '#94a3b8',
                        fontWeight: isDiagonal ? 600 : 400,
                      }}
                    >
                      {val.toFixed(1)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
