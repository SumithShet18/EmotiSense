import hashlib
import random
from typing import Optional

import numpy as np
import torch

from config import EMOTION_LABELS
from model_loader import get_model
from performance_profiler import ProfileStage

random.seed(42)
np.random.seed(42)
torch.manual_seed(42)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False

# CRITICAL: must match training exactly.
_TRAINED_ORDER = ["angry", "happy", "sad", "neutral", "frustrated"]
assert list(EMOTION_LABELS) == _TRAINED_ORDER, (
    f"config.EMOTION_LABELS {list(EMOTION_LABELS)} does not match the trained "
    f"order {_TRAINED_ORDER}. Update config.py or predictions will be silently "
    f"mislabeled."
)

TEXT_MODEL_NAME = "bert-base-uncased"   # tokenizer only — the encoder itself
                                          # is bundled inside the loaded model
TARGET_SAMPLE_RATE = 16000
MAX_AUDIO_LENGTH = 16000 * 6
MAX_TEXT_LENGTH = 128

_tokenizer = None
_transcript_cache: dict[str, str] = {}


def _get_tokenizer():
    global _tokenizer
    if _tokenizer is None:
        from transformers import AutoTokenizer
        _tokenizer = AutoTokenizer.from_pretrained(TEXT_MODEL_NAME)
    return _tokenizer


def _file_hash(path: str) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _trim_silence(waveform: torch.Tensor, top_db: float = 30.0, frame_length: int = 1024, hop_length: int = 256):
    n = waveform.shape[0]
    if n <= frame_length:
        return waveform
    frames = waveform.unfold(0, frame_length, hop_length)
    rms = frames.pow(2).mean(dim=-1).sqrt()
    rms_db = 20 * torch.log10(rms.clamp(min=1e-10))
    max_db = rms_db.max()
    mask = rms_db > (max_db - top_db)
    if not mask.any():
        return waveform
    idx = torch.nonzero(mask).squeeze(-1)
    start = idx[0].item() * hop_length
    end = min(idx[-1].item() * hop_length + frame_length, n)
    trimmed = waveform[start:end]
    return trimmed if trimmed.shape[0] > 0 else waveform


def _prepare_text(text: str):
    tokenizer = _get_tokenizer()
    enc = tokenizer(text, max_length=MAX_TEXT_LENGTH, truncation=True,
                     padding="max_length", return_tensors="pt")
    return enc["input_ids"], enc["attention_mask"]


def _prepare_audio(audio_path: str):
    import torchaudio
    import torchaudio.transforms as T

    waveform, sr = torchaudio.load(audio_path)
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
    if sr != TARGET_SAMPLE_RATE:
        waveform = T.Resample(sr, TARGET_SAMPLE_RATE)(waveform)
    waveform = waveform.squeeze(0)
    waveform = _trim_silence(waveform)
    waveform = waveform[:MAX_AUDIO_LENGTH]

    # Must match training exactly: zero-mean, unit-variance normalization
    # before padding, same as train_finetune.py's preprocessing.
    waveform = (waveform - waveform.mean()) / torch.sqrt(waveform.var() + 1e-7)

    real_len = waveform.shape[0]
    padded = torch.zeros(MAX_AUDIO_LENGTH)
    padded[:real_len] = waveform
    mask = torch.zeros(MAX_AUDIO_LENGTH, dtype=torch.long)
    mask[:real_len] = 1
    return padded.unsqueeze(0), mask.unsqueeze(0)


def predict_emotion(
    text: Optional[str] = None,
    audio_path: Optional[str] = None,
) -> tuple[str, float, dict[str, float], Optional[str], list[dict], dict]:
    stages: list[dict] = []
    model, device = get_model()
    transcript: Optional[str] = None
    text_for_classification: Optional[str] = text
    input_values = None
    attention_mask_audio = None

    if audio_path:
        file_key = _file_hash(audio_path)
        if file_key in _transcript_cache:
            transcript = _transcript_cache[file_key]
            with ProfileStage("Whisper Transcription") as s:
                pass
            stages.append(s.to_dict())
        else:
            from transcription import transcribe_audio
            with ProfileStage("Whisper Transcription") as s:
                try:
                    transcript = transcribe_audio(audio_path)
                    _transcript_cache[file_key] = transcript
                except Exception as e:
                    transcript = f"(transcription error: {e})"
            stages.append(s.to_dict())
        if transcript and transcript != "(no speech detected)" and not transcript.startswith("(transcription error"):
            text_for_classification = transcript

        with ProfileStage("Audio Preprocessing") as s:
            try:
                input_values, attention_mask_audio = _prepare_audio(audio_path)
                input_values = input_values.to(device)
                attention_mask_audio = attention_mask_audio.to(device)
            except Exception:
                input_values, attention_mask_audio = None, None
        stages.append(s.to_dict())

    if not text_for_classification:
        text_for_classification = transcript
    if not text_for_classification:
        raise ValueError("No text or audio transcription available for classification.")
    transcript = transcript or text

    with ProfileStage("Text Tokenization") as s:
        input_ids, attention_mask_text = _prepare_text(text_for_classification)
        input_ids = input_ids.to(device)
        attention_mask_text = attention_mask_text.to(device)
    stages.append(s.to_dict())

    with ProfileStage("Fine-Tuned Encoders + Cross-Modal Fusion") as s:
        model.eval()
        with torch.no_grad():
            logits = model(
                input_ids=input_ids, attention_mask_text=attention_mask_text,
                input_values=input_values, attention_mask_audio=attention_mask_audio,
            )
            probs = torch.softmax(logits, dim=-1).squeeze(0)
    stages.append(s.to_dict())

    prob_dict = {EMOTION_LABELS[i]: float(probs[i]) for i in range(len(EMOTION_LABELS))}
    pred_idx = int(torch.argmax(probs).item())
    emotion_label = EMOTION_LABELS[pred_idx]
    confidence = float(probs[pred_idx])

    total_latency = sum(st["latency_ms"] for st in stages)
    total_energy = sum(st["energy_joules"] for st in stages)
    peak_memory = max(st["memory_mb"] for st in stages)
    avg_cpu = round(sum(st["cpu_usage"] for st in stages) / len(stages), 2)
    throughput = round(1000 / total_latency, 2) if total_latency > 0 else 0.0

    totals = {
        "total_latency_ms": round(total_latency, 2),
        "total_energy_joules": round(total_energy, 4),
        "peak_memory_mb": round(peak_memory, 2),
        "avg_cpu_usage": avg_cpu,
        "throughput_inferences_per_sec": throughput,
    }

    return emotion_label, confidence, prob_dict, transcript, stages, totals
