import { motion } from 'framer-motion';

const pipelineSteps = [
  { label: 'Voice Input', icon: '🎤', detail: 'User records or uploads audio via the browser (MediaRecorder API / file upload).' },
  { label: 'Whisper ASR', icon: '📝', detail: 'OpenAI Whisper (large-v3) transcribes speech to text using a transformer encoder-decoder architecture.' },
  { label: 'MentalBERT', icon: '🧠', detail: 'A BERT-based model fine-tuned on mental health texts extracts semantic features from the transcript.' },
  { label: 'HuBERT', icon: '🔊', detail: 'Hidden-Unit BERT (HuBERT) extracts acoustic features from raw audio waveforms.' },
  { label: 'Cross-Modal Attention', icon: '⚡', detail: 'A multi-head attention layer fuses text features (MentalBERT) and audio features (HuBERT) into a unified representation.' },
  { label: 'Emotion Prediction', icon: '🎯', detail: 'A classifier head maps fused features to 6 emotion classes (angry, happy, sad, neutral, excited, frustrated).' },
];

const cloudComponents = [
  {
    title: 'SaaS — Frontend',
    icon: '☁️',
    items: [
      'React + TypeScript SPA hosted on Vercel',
      'Tailwind CSS with dark theme and glass effects',
      'Framer Motion page transitions',
      'CI/CD: auto-deploys from GitHub on push',
    ],
  },
  {
    title: 'PaaS — Backend API',
    icon: '⚙️',
    items: [
      'FastAPI application hosted on Render',
      'Python async runtime with Uvicorn',
      'Auto-scaling web service',
      'Health-check monitored by platform',
    ],
  },
  {
    title: 'Managed Database',
    icon: '🗄️',
    items: [
      'Supabase PostgreSQL (managed)',
      'RLS policies for secure access',
      'Auto-backups and point-in-time recovery',
      'JSONB support for probability data',
    ],
  },
  {
    title: 'Cloud Storage',
    icon: '📦',
    items: [
      'Supabase Storage bucket (audio-files)',
      'Public URL generation for playback',
      'No local file storage',
      'Scalable object storage (S3-compatible)',
    ],
  },
  {
    title: 'CI/CD Pipeline',
    icon: '🔄',
    items: [
      'GitHub → automatic deploy to Vercel (frontend)',
      'GitHub → manual/auto deploy to Render (backend)',
      'Environment variables managed per platform',
      'Zero-downtime deployments',
    ],
  },
  {
    title: 'Multi-Cloud Architecture',
    icon: '🌐',
    items: [
      'Frontend: Vercel (AWS Lambda + Edge Network)',
      'Backend: Render (Google Cloud Platform)',
      'Database: Supabase (AWS)',
      'Decoupled services communicate via REST API',
    ],
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.5 },
};

export default function ArchitecturePage() {
  return (
    <div>
      <motion.div className="mb-10" {...fadeUp}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phase 5</p>
        <h1 className="text-[clamp(1.8rem,4vw,2.25rem)] font-semibold tracking-sub leading-tight mt-1 text-foreground">
          Cloud Architecture
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          How EmotiSense works end-to-end — from voice input to emotion prediction, deployed across a multi-cloud infrastructure.
        </p>
      </motion.div>

      {/* Pipeline */}
      <motion.div className="card p-6 sm:p-8 mb-8" {...fadeUp}>
        <h2 className="text-lg font-semibold text-foreground mb-6">Model Pipeline</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pipelineSteps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              className="relative rounded-xl border border-border bg-white/[0.02] p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{step.icon}</span>
                <div>
                  <span className="text-xs text-muted-foreground/50">Step {i + 1}</span>
                  <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
              {i < pipelineSteps.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30">
                  →
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Cloud Components */}
      <motion.div className="card p-6 sm:p-8 mb-8" {...fadeUp}>
        <h2 className="text-lg font-semibold text-foreground mb-6">Cloud Infrastructure</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cloudComponents.map((comp, i) => (
            <motion.div
              key={comp.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              className="rounded-xl border border-border bg-white/[0.02] p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{comp.icon}</span>
                <h3 className="text-sm font-semibold text-foreground">{comp.title}</h3>
              </div>
              <ul className="space-y-1.5">
                {comp.items.map((item) => (
                  <li key={item} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Architecture Flow Diagram */}
      <motion.div className="card p-6 sm:p-8 mb-8" {...fadeUp}>
        <h2 className="text-lg font-semibold text-foreground mb-6">End-to-End Data Flow</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* User → Frontend */}
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 text-sm font-medium text-primary">User</div>
              <span className="text-muted-foreground/40">→</span>
              <div className="bg-white/5 border border-border rounded-lg px-4 py-2 text-sm text-foreground">Vercel Frontend (React SPA)</div>
            </div>
            {/* Frontend → Backend */}
            <div className="flex items-center gap-2 mb-2 ml-12">
              <span className="text-muted-foreground/40">↕</span>
              <span className="text-[10px] text-muted-foreground/50">REST API</span>
            </div>
            <div className="flex items-center gap-2 mb-2 ml-12">
              <div className="bg-white/5 border border-border rounded-lg px-4 py-2 text-sm text-foreground">Render Backend (FastAPI + Uvicorn)</div>
            </div>
            {/* Backend → Services */}
            <div className="flex items-start gap-4 mt-4 ml-12">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2 text-sm text-emerald-400">Supabase<br/>PostgreSQL</div>
              <span className="text-muted-foreground/40 mt-2">↕</span>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2 text-sm text-emerald-400">Supabase<br/>Storage</div>
              <span className="text-muted-foreground/40 mt-2">↕</span>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-2 text-sm text-purple-400">PyTorch<br/>Inference</div>
            </div>
            {/* Flow arrows */}
            <div className="mt-6 text-xs text-muted-foreground/50 space-y-1">
              <p>📤 Audio Upload → Supabase Storage → public URL stored in DB</p>
              <p>🧠 Prediction → emotion + confidence + probabilities → Supabase DB</p>
              <p>📊 History query → Backend reads Supabase DB → returns paginated results</p>
              <p>🔗 All services communicate over HTTPS; frontend uses VITE_API_URL</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Deployment Info */}
      <motion.div className="card p-6 sm:p-8" {...fadeUp}>
        <h2 className="text-lg font-semibold text-foreground mb-4">Deployment URLs</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-24 text-muted-foreground">Frontend:</span>
            <a href="https://frontend-rose-nine-21.vercel.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              https://frontend-rose-nine-21.vercel.app
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-muted-foreground">Backend:</span>
            <a href="https://emotisense-backend.onrender.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              https://emotisense-backend.onrender.com
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-muted-foreground">Database:</span>
            <span className="text-foreground">Supabase PostgreSQL (managed)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-muted-foreground">Storage:</span>
            <span className="text-foreground">Supabase Storage (bucket: audio-files)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-muted-foreground">CI/CD:</span>
            <span className="text-foreground">GitHub → Vercel (auto) + Render (manual deploy)</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
