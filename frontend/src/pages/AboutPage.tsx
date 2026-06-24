import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
  viewport: { once: true, margin: '-40px' },
};

const technologies = [
  {
    name: 'MentalBERT',
    tag: 'Text Encoder',
    icon: '📝',
    description:
      'MentalBERT is a transformer language model pre-trained on mental health-related text from Reddit communities. It captures nuanced emotional and psychological cues in text that general-purpose BERT models may miss.',
    details: [
      'Pre-trained on mental health discourse',
      '768-dimensional hidden representations',
      'Fine-tuned for emotion understanding',
      'Tokenizes text at subword level',
    ],
  },
  {
    name: 'HuBERT',
    tag: 'Audio Encoder',
    icon: '🎵',
    description:
      'HuBERT (Hidden-Unit BERT) is a self-supervised speech representation model developed by Meta AI. It learns rich acoustic features from raw audio without requiring transcribed labels.',
    details: [
      'Self-supervised learning from raw audio',
      'Captures prosody, tone, and intonation',
      '12 transformer layers, 768-dim hidden',
      'Robust to noise and recording variations',
    ],
  },
  {
    name: 'Whisper',
    tag: 'Speech-to-Text',
    icon: '🎤',
    description:
      'Whisper is OpenAI\'s general-purpose speech recognition model. It transcribes audio into text with high accuracy across multiple languages and acoustic conditions.',
    details: [
      'Trained on 680k hours of multilingual data',
      'Robust to background noise and accents',
      'Runs locally via faster-whisper inference',
      'Base model: 90M parameters (fast local inference)',
    ],
  },
  {
    name: 'Cross-Modal Attention',
    tag: 'Fusion Mechanism',
    icon: '🔗',
    description:
      'Cross-modal attention aligns and fuses features from text and audio modalities. The attention layer learns which parts of the text correspond to which parts of the audio, creating a joint representation.',
    details: [
      'Multi-head attention over modality pairs',
      'Query from text, key/value from audio',
      'Produces unified 768-dim feature vector',
      'Enables complementary modality fusion',
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="pb-16 space-y-20">
      <motion.section {...fadeUp}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">About</p>
        <h1 className="text-[clamp(1.8rem,4vw,2.25rem)] font-semibold tracking-sub leading-tight mt-1 text-foreground">About EmotiSense</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          EmotiSense is a multimodal emotion detection system that combines speech transcription,
          text encoding, audio encoding, and cross-modal attention to classify human emotions
          from voice recordings with enterprise-grade accuracy.
        </p>
      </motion.section>

      {/* Pipeline */}
      <motion.section {...fadeUp}>
        <h2 className="text-xl font-semibold text-foreground mb-6">Processing Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { step: 'Voice Input', icon: '🎤', desc: 'Audio captured via microphone or file upload' },
            { step: 'Whisper STT', icon: '📝', desc: 'Automatic speech transcription (base model)' },
            { step: 'Dual Encoding', icon: '🧠', desc: 'MentalBERT (text) + HuBERT (audio)' },
            { step: 'Cross-Attention', icon: '🔗', desc: 'Feature fusion via attention' },
            { step: 'Classification', icon: '📊', desc: '6-class emotion output' },
          ].map((p) => (
            <div key={p.step} className="card p-4 text-center">
              <span className="text-2xl mb-1.5 block">{p.icon}</span>
              <h4 className="text-sm font-medium text-foreground mb-0.5">{p.step}</h4>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Technologies */}
      <div className="space-y-5">
        {technologies.map((tech) => (
          <motion.section key={tech.name} {...fadeUp} className="card overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tech.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{tech.name}</h2>
                    <span className="tag text-[10px]">{tech.tag}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{tech.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {tech.details.map((d) => (
                  <div key={d} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        ))}
      </div>

      {/* Emotion classes */}
      <motion.section {...fadeUp} className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-5">Emotion Classes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Happy', icon: '😊' },
            { label: 'Sad', icon: '😢' },
            { label: 'Angry', icon: '😡' },
            { label: 'Neutral', icon: '😐' },
            { label: 'Excited', icon: '🤩' },
            { label: 'Frustrated', icon: '😤' },
          ].map((e) => (
            <div key={e.label} className="card-hover p-4 text-center">
              <span className="text-2xl block mb-1">{e.icon}</span>
              <span className="text-sm font-medium text-foreground">{e.label}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Architecture overview */}
      <motion.section {...fadeUp} className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">Architecture Overview</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Audio is transcribed by Whisper, then the transcript and original audio are independently encoded
          by MentalBERT and HuBERT respectively. A cross-modal attention layer fuses the 768-dimensional
          feature vectors. The fused representation passes through a classifier head (Linear &rarr; ReLU &rarr; Dropout &rarr; Linear)
          to produce a probability distribution over six emotion classes. The entire pipeline runs locally
          with no external API dependencies.
        </p>
      </motion.section>
    </div>
  );
}
