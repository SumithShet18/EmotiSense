export interface PipelineStage {
  id: string;
  modality: "input" | "text" | "audio" | "fusion" | "output";
  title: string;
  description: string;
  technicalDetail: string;
  exampleInput: string;
  exampleOutput: string;
  dimensions?: string;
}

export const pipelineStages: PipelineStage[] = [
  {
    id: "audio-input",
    modality: "input",
    title: "Audio Input",
    description: "The only input to the system — a voice recording. There's no separate text entry; everything downstream, including the text analysis, is derived from this one recording.",
    technicalDetail: "Accepts .wav/.mp3/.m4a, resampled to 16kHz mono. This single input forks into two independent paths below: one derives text via transcription, the other processes the raw waveform directly.",
    exampleInput: `voice recording, "I can't believe this happened again, it's so frustrating"`,
    exampleOutput: "3.2s, 51,200 raw samples",
  },
  {
    id: "whisper-transcribe",
    modality: "text",
    title: "Whisper Transcription",
    description: "The recording is transcribed to text — this is where the text side of the pipeline actually comes from, not a separate typed input.",
    technicalDetail: "faster-whisper (base model) speech-to-text. Output feeds the text track below; the raw audio (unchanged) separately feeds the audio track in parallel.",
    exampleInput: "51,200 raw samples",
    exampleOutput: `"I can't believe this happened again, it's so frustrating"`,
  },
  {
    id: "text-tokenize",
    modality: "text",
    title: "BERT Tokenization",
    description: "The transcribed text is broken into subword pieces the model understands.",
    technicalDetail: "bert-base-uncased WordPiece tokenizer, max_length=128, padded/truncated.",
    exampleInput: `"frustrating"`,
    exampleOutput: `["frustrat", "##ing"] → token IDs [21615, 2075]`,
  },
  {
    id: "text-encode",
    modality: "text",
    title: "Fine-Tuned BERT Encoding",
    description: "The last 3 layers of BERT were fine-tuned specifically on emotional speech transcripts — not used off-the-shelf.",
    technicalDetail: "Last 3 of 12 encoder layers unfrozen and fine-tuned; earlier 9 layers keep general-purpose pretrained representations. Mean-pooled (attention-masked) over all real tokens — not CLS-token pooling, which testing showed was a weaker sentence representation.",
    exampleInput: "13 tokens → BERT",
    exampleOutput: "768-dimensional embedding",
    dimensions: "[1, 768]",
  },
  {
    id: "audio-vad",
    modality: "audio",
    title: "Silence Trimming",
    description: "Leading/trailing silence is trimmed from the same raw recording so it doesn't dilute the emotional signal in the audio.",
    technicalDetail: "Energy-based VAD, 30dB threshold relative to peak RMS, frame_length=1024, hop_length=256. Operates on the raw waveform independently of transcription.",
    exampleInput: "51,200 samples (incl. 0.4s silence)",
    exampleOutput: "44,800 samples (trimmed)",
  },
  {
    id: "audio-normalize",
    modality: "audio",
    title: "Normalization",
    description: "The trimmed audio is standardized before being fed into the model.",
    technicalDetail: "Zero-mean, unit-variance normalization — matches HuBERT's pretraining distribution.",
    exampleInput: "raw amplitude range",
    exampleOutput: "normalized amplitude, μ=0 σ=1",
  },
  {
    id: "audio-encode",
    modality: "audio",
    title: "Fine-Tuned HuBERT Encoding",
    description: "The last 3 layers of HuBERT were fine-tuned on this task, same approach as the text side — and this runs on the actual voice recording, not a description of it.",
    technicalDetail: "facebook/hubert-base-ls960, last 3 of 12 transformer layers unfrozen. CNN feature extractor stays frozen (standard practice). Masked mean-pooling over real (non-padded) frames only.",
    exampleInput: "44,800 samples → HuBERT",
    exampleOutput: "768-dimensional embedding",
    dimensions: "[1, 768]",
  },
  {
    id: "fusion-norm",
    modality: "fusion",
    title: "Per-Modality Normalization",
    description: "The transcript-derived text embedding and the raw-audio embedding are standardized onto the same scale before combining.",
    technicalDetail: "Independent LayerNorm applied to each modality — raw BERT/HuBERT outputs live on different numeric scales.",
    exampleInput: "2 × 768-dim embeddings",
    exampleOutput: "2 × normalized 768-dim embeddings",
  },
  {
    id: "fusion-attention",
    modality: "fusion",
    title: "Cross-Modal Attention",
    description: "The text representation \"looks at\" the audio representation to see what's relevant to it.",
    technicalDetail: "8-head multi-head cross-attention, text as query, audio as key/value.",
    exampleInput: "text_features, audio_features",
    exampleOutput: "attended audio-informed vector",
  },
  {
    id: "fusion-gate",
    modality: "fusion",
    title: "Learned Gated Fusion",
    description: "A small learned gate decides, per prediction, how much to trust the tone of voice versus the words alone — audio doesn't always help (flat delivery, background noise), so the model learns when to lean on it.",
    technicalDetail: "fused = text_features + sigmoid(gate(text, attended)) × attended, followed by residual LayerNorm. This gate is what's shown as \"modality contribution\" on the Explain page.",
    exampleInput: "text + attended audio",
    exampleOutput: "single 768-dim fused representation",
  },
  {
    id: "classify",
    modality: "output",
    title: "Classification",
    description: "The fused representation is mapped to one of 5 emotions.",
    technicalDetail: "Linear(768→256) → ReLU → Dropout(0.3) → Linear(256→5) → softmax.",
    exampleInput: "768-dim fused vector",
    exampleOutput: "5 probabilities (angry, happy, sad, neutral, frustrated)",
  },
];

export const modelStats = {
  testAccuracy: 65.17,
  testMacroF1: 64.90,
  numClasses: 5,
  classes: ["angry", "happy", "sad", "neutral", "frustrated"] as const,
};
