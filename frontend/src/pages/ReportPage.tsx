import { motion } from 'framer-motion';

const techStack = [
  { category: 'Frontend', tech: 'React + TypeScript + Tailwind CSS + Vite', icon: '⚛️' },
  { category: 'Backend', tech: 'FastAPI + Python + Uvicorn', icon: '🐍' },
  { category: 'Database', tech: 'Supabase PostgreSQL', icon: '🗄️' },
  { category: 'Storage', tech: 'Supabase Storage (S3-compatible)', icon: '📦' },
  { category: 'ML Model', tech: 'MentalBERT + HuBERT + Cross-Attention Fusion', icon: '🧠' },
  { category: 'Speech-to-Text', tech: 'OpenAI Whisper (large-v3)', icon: '📝' },
  { category: 'Deployment', tech: 'Vercel (frontend) + Render (backend)', icon: '☁️' },
  { category: 'CI/CD', tech: 'GitHub → auto-deploy pipelines', icon: '🔄' },
];

const pipelineSteps = [
  { step: '1', label: 'Voice Input', desc: 'MediaRecorder API or file upload', color: 'from-blue-500 to-blue-600' },
  { step: '2', label: 'Whisper ASR', desc: 'Speech-to-text transcription', color: 'from-emerald-500 to-emerald-600' },
  { step: '3', label: 'MentalBERT', desc: 'Text feature extraction', color: 'from-violet-500 to-violet-600' },
  { step: '4', label: 'HuBERT', desc: 'Audio feature extraction', color: 'from-orange-500 to-orange-600' },
  { step: '5', label: 'Cross-Modal Fusion', desc: 'Multi-head attention', color: 'from-pink-500 to-pink-600' },
  { step: '6', label: 'Emotion Output', desc: '6-class classification', color: 'from-cyan-500 to-cyan-600' },
];

const emotionClasses = [
  { emotion: 'Angry', icon: '😡', color: '#ef4444', desc: 'Frustration, irritation, or hostility expressed in speech or text' },
  { emotion: 'Happy', icon: '😊', color: '#22c55e', desc: 'Joy, satisfaction, or positive emotional states' },
  { emotion: 'Sad', icon: '😢', color: '#3b82f6', desc: 'Melancholy, disappointment, or low mood' },
  { emotion: 'Neutral', icon: '😐', color: '#6b7280', desc: 'Calm, balanced, or emotionally flat states' },
  { emotion: 'Excited', icon: '🤩', color: '#a855f7', desc: 'Anticipation, enthusiasm, or heightened positive affect' },
  { emotion: 'Frustrated', icon: '😤', color: '#f97316', desc: 'Annoyance, irritation, or blocked goals' },
];

export default function ReportPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-6"
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project Report</p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight mt-2 text-foreground">
          EmotiSense
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
          Multimodal AI Mental Health Emotion Detection — Architecture, Technology Stack & Deployment Overview
        </p>
      </motion.div>

      {/* Pipeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-foreground mb-6 text-center">Model Pipeline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipelineSteps.map((p) => (
            <div key={p.step} className="relative rounded-xl border border-border bg-white/[0.02] p-4 text-center">
              <div className={`w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-sm font-bold`}>
                {p.step}
              </div>
              <h3 className="text-xs font-semibold text-foreground mb-1">{p.label}</h3>
              <p className="text-[10px] text-muted-foreground leading-tight">{p.desc}</p>
              {parseInt(p.step) < 6 && (
                <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/20 text-lg">→</div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Architecture Diagram */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-foreground mb-6 text-center">System Architecture</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[600px] flex flex-col items-center">
            {/* Flow */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
              <div className="text-right text-muted-foreground text-xs py-2">Audio Path</div>
              <div className="text-left text-muted-foreground text-xs py-2">Text Path</div>

              <div className="text-right">
                <div className="inline-block bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2 text-blue-400 font-medium">Voice Input 🎤</div>
              </div>
              <div className="text-left">
                <div className="inline-block bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2 text-blue-400 font-medium">Text Input ⌨️</div>
              </div>

              <div className="text-right"><span className="text-muted-foreground/40">↓</span></div>
              <div className="text-left"><span className="text-muted-foreground/40">↓</span></div>

              <div className="text-right">
                <div className="inline-block bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2 text-emerald-400 font-medium">Whisper ASR</div>
              </div>
              <div className="text-left">
                <div className="invisible">placeholder</div>
              </div>

              <div className="text-right"><span className="text-muted-foreground/40">↓</span></div>
              <div className="text-left"><span className="text-muted-foreground/40">↓</span></div>

              <div className="text-right">
                <div className="inline-block bg-violet-500/10 border border-violet-500/30 rounded-lg px-4 py-2 text-violet-400 font-medium">HuBERT</div>
              </div>
              <div className="text-left">
                <div className="inline-block bg-violet-500/10 border border-violet-500/30 rounded-lg px-4 py-2 text-violet-400 font-medium">MentalBERT</div>
              </div>

              <div className="col-span-2 text-center"><span className="text-muted-foreground/40">↓</span></div>

              <div className="col-span-2 text-center">
                <div className="inline-block bg-pink-500/10 border border-pink-500/30 rounded-lg px-5 py-3 text-pink-400 font-semibold">
                  Cross-Modal Attention Fusion
                </div>
              </div>

              <div className="col-span-2 text-center"><span className="text-muted-foreground/40">↓</span></div>

              <div className="col-span-2 text-center">
                <div className="inline-block bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-5 py-3 text-cyan-400 font-semibold">
                  Emotion Prediction (6 classes)
                </div>
              </div>

              <div className="col-span-2 text-center"><span className="text-muted-foreground/40">↓</span></div>

              <div className="col-span-2 text-center">
                <div className="inline-block bg-amber-500/10 border border-amber-500/30 rounded-lg px-5 py-3 text-amber-400 font-semibold">
                  Supabase Database + Storage
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 text-xs text-muted-foreground/60 text-center">
          Frontend (Vercel) → Backend API (Render) → Model Inference → Supabase (DB & Storage)
        </div>
      </motion.div>

      {/* Technology Stack */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-foreground mb-6 text-center">Technology Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {techStack.map((t) => (
            <div key={t.category} className="rounded-xl border border-border bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs font-semibold text-foreground">{t.category}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{t.tech}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Emotion Classes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-foreground mb-6 text-center">Emotion Classes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {emotionClasses.map((e) => (
            <div key={e.emotion} className="rounded-xl border border-border bg-white/[0.02] p-4 text-center">
              <span className="text-3xl block mb-2">{e.icon}</span>
              <h3 className="text-sm font-semibold text-foreground capitalize" style={{ color: e.color }}>{e.emotion}</h3>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{e.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Deployment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-foreground mb-6 text-center">Deployment Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="rounded-xl border border-border bg-white/[0.02] p-5">
            <div className="text-2xl mb-2">⚛️</div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Frontend</h3>
            <p className="text-[11px] text-muted-foreground">Vercel (Edge Network)</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">React SPA · Auto-deploy from GitHub</p>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-5">
            <div className="text-2xl mb-2">⚙️</div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Backend</h3>
            <p className="text-[11px] text-muted-foreground">Render (GCP)</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">FastAPI · Uvicorn · Python 3.11</p>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-5">
            <div className="text-2xl mb-2">🗄️</div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Database</h3>
            <p className="text-[11px] text-muted-foreground">Supabase (AWS)</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">PostgreSQL · Managed Storage</p>
          </div>
        </div>
        <div className="mt-6 text-xs text-muted-foreground/60 text-center">
          Multi-Cloud Architecture: Vercel (AWS) → Render (GCP) → Supabase (AWS)
        </div>
      </motion.div>

      {/* Footer note */}
      <div className="text-center text-[10px] text-muted-foreground/40 pb-8">
        EmotiSense — Project Report • Generated June 2026
      </div>
    </div>
  );
}
