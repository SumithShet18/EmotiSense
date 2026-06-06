import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { predict } from '../api/client';
import ResultCard from '../components/ResultCard';

const processingSteps = [
  { key: 'upload', label: 'Uploading Audio' },
  { key: 'transcribe', label: 'Transcribing Speech' },
  { key: 'text', label: 'Analyzing Text' },
  { key: 'audio', label: 'Analyzing Voice' },
  { key: 'fusion', label: 'Cross-Modal Fusion' },
  { key: 'prediction', label: 'Generating Prediction' },
];

type Result = {
  id: number;
  transcript: string | null;
  emotion: string;
  confidence: number;
  probabilities: Record<string, number>;
} | null;

export default function AnalyzePage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [currentStep, setCurrentStep] = useState(-1);

  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function encodeWav(samples: Float32Array, sampleRate: number): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = samples.length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const write = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    write(0, 'RIFF');
    view.setUint32(4, buffer.byteLength - 8, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    write(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
      scriptNodeRef.current = scriptNode;
      samplesRef.current = [];

      scriptNode.onaudioprocess = (e) => {
        samplesRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      source.connect(scriptNode);
      scriptNode.connect(audioContext.destination);

      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setError('Microphone access denied or unavailable.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    const sampleRate = audioContextRef.current?.sampleRate || 44100;

    if (scriptNodeRef.current) { scriptNodeRef.current.disconnect(); scriptNodeRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach((t) => t.stop()); mediaStreamRef.current = null; }

    const chunks = samplesRef.current;
    if (chunks.length === 0) { setError('No audio recorded.'); setRecording(false); return; }

    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    const combined = new Float32Array(totalLen);
    let off = 0;
    for (const c of chunks) { combined.set(c, off); off += c.length; }

    const wavBlob = encodeWav(combined, sampleRate);
    const file = new File([wavBlob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, [audioUrl]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setError(null);
    setResult(null);
  }

  function clearAudio() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleAnalyze() {
    setError(null);
    setResult(null);
    if (!audioFile) { setError('Record or upload audio to analyze.'); return; }

    setLoading(true);
    setCurrentStep(0);

    const interval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, processingSteps.length - 1));
    }, 800);

    try {
      const res = await predict(undefined, audioFile);
      clearInterval(interval);
      setCurrentStep(processingSteps.length - 1);
      setTimeout(() => {
        setResult(res);
        setLoading(false);
        setCurrentStep(-1);
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Prediction failed.');
      setLoading(false);
      setCurrentStep(-1);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div>
      <div className="mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice Emotion Analysis</p>
        <h1 className="text-[clamp(1.8rem,5vw,3rem)] font-semibold tracking-heading leading-tight mt-1 text-foreground">Speak how you feel</h1>
        <p className="text-muted-foreground mt-1.5">Record your voice and let our multimodal AI understand both your words and your vocal emotions.</p>
      </div>

      <div className="mt-8 max-w-2xl mx-auto space-y-6">
        {/* Recording / Upload card */}
        <div className="card p-6">
          {!audioUrl && !recording && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Mic idle</p>
              <p className="text-sm text-muted-foreground mb-6">Tap the button below to start recording</p>
              <button onClick={startRecording} className="btn-primary text-base !px-10 !py-3 inline-flex items-center gap-2.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
                Start Recording
              </button>
            </div>
          )}

          {recording && (
            <div className="text-center py-8">
              <div className="w-24 h-24 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5 relative">
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-red-500/30"
                  animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="w-10 h-10 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
              <p className="text-3xl font-semibold font-mono text-foreground mb-1">{formatTime(recordingTime)}</p>
              <p className="text-sm text-muted-foreground mb-6">Recording...</p>
              <button onClick={stopRecording} className="btn-primary text-base !px-10 !py-3 inline-flex items-center gap-2.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                Stop Recording
              </button>
            </div>
          )}

          {audioUrl && !recording && (
            <div className="py-2">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{audioFile?.name}</p>
                  <p className="text-xs text-muted-foreground">Ready for analysis</p>
                </div>
              </div>
              <audio controls src={audioUrl} className="w-full mb-5 rounded-xl [&::-webkit-media-controls-panel]:bg-background" />
              <div className="flex items-center gap-3">
                <button onClick={startRecording} className="btn-secondary text-sm">Record Again</button>
                <button onClick={clearAudio} className="btn-ghost text-sm">Remove</button>
                <div className="flex-1" />
                <button onClick={handleAnalyze} disabled={loading} className="btn-primary text-sm !px-8">
                  {loading ? 'Analyzing...' : 'Analyze Emotion'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Upload area */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload audio file"
          className="glass rounded-2xl border-2 border-dashed border-border p-6 text-center hover:border-primary/50 transition-colors duration-150 cursor-pointer"
          onClick={() => !recording && fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        >
          <svg className="w-8 h-8 text-muted-foreground mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-muted-foreground">Optional — upload a file instead</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Drop or browse — WAV &middot; MP3 &middot; M4A &middot; &le; 10MB</p>
          <input ref={fileInputRef} type="file" accept=".wav,.mp3,.m4a,audio/wav,audio/mpeg,audio/mp4,audio/x-m4a" onChange={handleFileSelect} className="hidden" />
        </div>

        {/* Processing steps */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card p-5 space-y-2.5"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Processing</p>
              {processingSteps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-pill flex items-center justify-center text-[11px] font-medium transition-all duration-300 ${
                    i < currentStep ? 'bg-green-500 text-white' :
                    i === currentStep ? 'bg-primary text-primary-foreground' :
                    'bg-white/5 text-muted-foreground'
                  }`}>
                    {i < currentStep ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-sm transition-colors duration-300 ${
                    i <= currentStep ? 'text-foreground' : 'text-muted-foreground/40'
                  }`}>
                    {s.label}
                  </span>
                  {i === currentStep && (
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ResultCard
                emotion={result.emotion}
                confidence={result.confidence}
                probabilities={result.probabilities}
                transcript={result.transcript}
                timestamp={new Date().toISOString()}
                audioUrl={audioUrl}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-3.5 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
