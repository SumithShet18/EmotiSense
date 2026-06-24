import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
  viewport: { once: true, margin: '-40px' },
};

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Voice-First Capture',
    desc: 'Just speak — your microphone is the only input you need.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
    title: 'Whisper Transcription',
    desc: 'Speech is auto-transcribed for semantic understanding.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    title: 'Cross-Modal Fusion',
    desc: 'MentalBERT + HuBERT combined through cross-attention.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Six Emotion Classes',
    desc: 'Angry · Happy · Sad · Neutral · Excited · Frustrated.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Privacy First',
    desc: 'Voice is processed for inference only — never stored.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
      </svg>
    ),
    title: 'Explainable Output',
    desc: 'Confidence scores and probability distribution per class.',
  },
];

export default function HomePage() {
  return (
    <div className="pb-24">
      {/* ─── Hero ─── */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="gradient-hero" />
        <div className="grid-pattern absolute inset-0" />
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center px-3 py-1 rounded-pill glass text-xs font-medium text-muted-foreground mb-6"
          >
            Transformer-based &middot; Speech + Language
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[clamp(2.2rem,7vw,3.75rem)] font-semibold tracking-display leading-[1.1] text-balance"
          >
            AI-Powered Multimodal<br />
            <span className="gradient-text">Mental Health Emotion Detection</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto text-balance"
          >
            Speak naturally and let AI understand both your words and your vocal emotions
            through transformer-based multimodal intelligence.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex items-center justify-center gap-4 flex-wrap"
          >
            <Link to="/analyze" className="btn-primary text-base !px-8 !py-3">
              Start Emotion Analysis
            </Link>
            <Link to="/history" className="btn-secondary text-base !px-8 !py-3">
              View Sample Dashboard
            </Link>
          </motion.div>
        </div>

        {/* Live recording visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative z-10 mt-16 max-w-lg mx-auto card p-6 text-center"
        >
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-primary to-accent animate-wave"
                style={{
                  height: `${h * 8}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1.2s',
                }}
              />
            ))}
          </div>
          <p className="text-sm font-medium text-foreground">Real-time Audio Capture</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Microphone input &middot; 16kHz &middot; Mono</p>
        </motion.div>
      </section>

      {/* ─── Features ─── */}
      <section className="mb-24">
        <motion.div {...fadeUp} className="text-center mb-12">
          <h2 className="text-[clamp(1.8rem,5vw,3rem)] font-semibold tracking-heading leading-tight text-balance text-foreground">Built for mental health intelligence</h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="card-hover p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3.5 text-primary">
                {f.icon}
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="mb-24">
        <motion.div {...fadeUp}>
          <h2 className="text-[clamp(1.8rem,5vw,3rem)] font-semibold tracking-heading leading-tight text-balance mb-12 text-center text-foreground">Two signals. One intelligent prediction.</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-3xl mx-auto">
          {[
            { num: '1', text: 'Your voice is captured directly from the microphone.' },
            { num: '2', text: 'Whisper transcribes the audio into clean text.' },
            { num: '3', text: 'MentalBERT extracts semantic features from the transcript.' },
            { num: '4', text: 'HuBERT extracts acoustic features (prosody, pitch, tone).' },
            { num: '5', text: 'Cross-modal attention fuses both signals into one embedding.' },
            { num: '6', text: 'Classifier predicts emotion across 6 classes with confidence.' },
          ].map((step) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-4"
            >
              <span className="text-3xl font-semibold text-white/5 leading-none mt-0.5 min-w-[2rem]">{step.num}</span>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Architecture ─── */}
      <section className="mb-24">
        <motion.div {...fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="card p-5 text-center">
            <h3 className="text-base font-semibold text-foreground mb-1">MentalBERT</h3>
            <p className="text-xs text-muted-foreground">Semantic features from transcript</p>
          </div>
          <div className="glass-strong p-5 text-center rounded-2xl">
            <h3 className="text-base font-semibold text-foreground mb-1">Cross-Modal Attention Fusion</h3>
            <p className="text-xs text-muted-foreground">Combines speech and language embeddings into one unified prediction.</p>
          </div>
          <div className="card p-5 text-center">
            <h3 className="text-base font-semibold text-foreground mb-1">HuBERT</h3>
            <p className="text-xs text-muted-foreground">Acoustic features from voice</p>
          </div>
        </motion.div>
      </section>

      {/* ─── CTA ─── */}
      <motion.section {...fadeUp} className="glass-strong p-12 md:p-16 text-center relative overflow-hidden rounded-3xl">
        <div className="gradient-hero" />
        <div className="relative z-10">
          <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-sub leading-tight mb-4 text-foreground">
            Ready to analyze emotions?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Record your voice or upload audio. Whisper transcribes it automatically.
          </p>
          <Link to="/analyze" className="btn-primary text-base !px-10 !py-3">
            Get Started
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
