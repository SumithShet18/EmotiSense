import { motion } from 'framer-motion';
import PipelineWalkthrough from '../components/PipelineWalkthrough';

export default function ArchitecturePage() {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Architecture</p>
        <h1 className="text-[clamp(1.8rem,4vw,2.25rem)] font-semibold tracking-sub leading-tight mt-1 text-foreground">
          Model Architecture
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          How EmotiSense turns speech and text into emotion predictions — from raw input
          through fine-tuned encoders to gated multimodal fusion.
        </p>
      </motion.div>

      <PipelineWalkthrough />
    </div>
  );
}
