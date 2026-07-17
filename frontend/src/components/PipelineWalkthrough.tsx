import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Type,
  AudioWaveform,
  GitFork,
  GitMerge,
  Sparkles,
  ChevronDown,
  Info,
  Code2,
} from "lucide-react";
import { pipelineStages, modelStats, type PipelineStage } from "../data/pipelineStages";

const MODALITY_STYLES: Record<
  PipelineStage["modality"],
  { icon: typeof Type; accent: string; ring: string }
> = {
  input: { icon: Mic, accent: "text-slate-200", ring: "ring-white/20" },
  text: { icon: Type, accent: "text-teal-300", ring: "ring-teal-400/30" },
  audio: { icon: AudioWaveform, accent: "text-cyan-300", ring: "ring-cyan-400/30" },
  fusion: { icon: GitMerge, accent: "text-amber-300", ring: "ring-amber-400/30" },
  output: { icon: Sparkles, accent: "text-emerald-300", ring: "ring-emerald-400/30" },
};

function StageNode({
  stage,
  index,
  showTechnical,
}: {
  stage: PipelineStage;
  index: number;
  showTechnical: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { icon: Icon, accent, ring } = MODALITY_STYLES[stage.modality];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="relative"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm
                    px-4 py-3 ring-1 ${ring} hover:bg-white/[0.06] transition-colors
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400`}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className={`shrink-0 rounded-lg bg-white/5 p-2 ${accent}`}>
            <Icon size={16} />
          </span>
          <span className="flex-1 text-sm font-medium text-slate-100">{stage.title}</span>
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="mt-2 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm">
            <p className="text-slate-300">
              {showTechnical ? stage.technicalDetail : stage.description}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                <div className="text-slate-500">In</div>
                <div className="mt-0.5 font-mono text-slate-300">{stage.exampleInput}</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                <div className="text-slate-500">Out</div>
                <div className="mt-0.5 font-mono text-slate-300">{stage.exampleOutput}</div>
              </div>
            </div>
            {stage.dimensions && (
              <div className="mt-2 text-xs text-slate-500">shape: {stage.dimensions}</div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function TrackConnector() {
  return (
    <div className="flex justify-center py-1">
      <div className="h-4 w-px bg-gradient-to-b from-white/20 to-white/5" />
    </div>
  );
}

export default function PipelineWalkthrough() {
  const [showTechnical, setShowTechnical] = useState(false);

  const inputStage = pipelineStages.find((s) => s.modality === "input")!;
  const textStages = pipelineStages.filter((s) => s.modality === "text");
  const audioStages = pipelineStages.filter((s) => s.modality === "audio");
  const fusionStages = pipelineStages.filter((s) => s.modality === "fusion");
  const outputStages = pipelineStages.filter((s) => s.modality === "output");

  return (
    <div className="mx-auto max-w-4xl">
      {/* Disclosure */}
      <div className="mb-8 flex items-start gap-2 rounded-xl border border-teal-400/20 bg-teal-400/5 px-4 py-3 text-sm text-teal-200">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>
          Illustrative walkthrough using a representative example. For your own recording,
          see the <span className="font-medium">Explain</span> page for a live,
          per-prediction breakdown.
        </p>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">How a prediction is made</h2>
        <button
          onClick={() => setShowTechnical((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5
                     px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
        >
          <Code2 size={13} />
          {showTechnical ? "Plain-language" : "Technical detail"}
        </button>
      </div>

      {/* Single input — one recording, nothing else goes in */}
      <div className="mx-auto max-w-md">
        <StageNode stage={inputStage} index={0} showTechnical={showTechnical} />
      </div>

      {/* Fork — the one recording splits into two independent paths */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="my-6 flex flex-col items-center"
      >
        <div className="h-6 w-px bg-white/15" />
        <div className="rounded-full border border-white/15 bg-white/5 p-2.5">
          <GitFork size={18} className="text-slate-300" />
        </div>
        <span className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          one recording, two independent paths
        </span>
      </motion.div>

      {/* Dual-track: transcript-derived text, and the raw waveform, processed in parallel */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-300/80">
            <Type size={13} /> Text track (from transcript)
          </div>
          <div className="space-y-2">
            {textStages.map((stage, i) => (
              <StageNode key={stage.id} stage={stage} index={i} showTechnical={showTechnical} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-300/80">
            <AudioWaveform size={13} /> Audio track (raw waveform)
          </div>
          <div className="space-y-2">
            {audioStages.map((stage, i) => (
              <StageNode key={stage.id} stage={stage} index={i} showTechnical={showTechnical} />
            ))}
          </div>
        </div>
      </div>

      {/* Convergence point */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="my-8 flex flex-col items-center"
      >
        <div className="flex items-center gap-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-teal-400/40 md:w-24" />
          <div className="rounded-full border border-amber-400/30 bg-amber-400/10 p-3">
            <GitMerge size={20} className="text-amber-300" />
          </div>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyan-400/40 md:w-24" />
        </div>
        <span className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-300/70">
          the two paths meet back up here
        </span>
      </motion.div>

      {/* Fusion + output, single centered column */}
      <div className="mx-auto max-w-md space-y-2">
        {fusionStages.map((stage, i) => (
          <div key={stage.id}>
            <StageNode stage={stage} index={i} showTechnical={showTechnical} />
            {i < fusionStages.length - 1 && <TrackConnector />}
          </div>
        ))}
        <TrackConnector />
        {outputStages.map((stage, i) => (
          <StageNode key={stage.id} stage={stage} index={i} showTechnical={showTechnical} />
        ))}
      </div>

      {/* Measured results */}
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
          <div>
            <div className="text-2xl font-semibold text-teal-300">{modelStats.testAccuracy}%</div>
            <div className="mt-1 text-xs text-slate-500">Test accuracy</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-teal-300">{modelStats.testMacroF1}%</div>
            <div className="mt-1 text-xs text-slate-500">Macro-F1</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-200">{modelStats.numClasses}</div>
            <div className="mt-1 text-xs text-slate-500">Emotion classes</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-200">3+3</div>
            <div className="mt-1 text-xs text-slate-500">Fine-tuned layers (text+audio)</div>
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-slate-500">
          Measured on a held-out test set the model never saw during training. This is a
          supplementary signal, not a clinical or diagnostic tool.
        </p>
      </div>
    </div>
  );
}
