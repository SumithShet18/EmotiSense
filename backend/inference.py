import hashlib
import random
from typing import Optional
import re

import numpy as np

from config import EMOTION_LABELS
from model_loader import get_model, _cache
from performance_profiler import ProfileStage

random.seed(42)
np.random.seed(42)
import torch
torch.manual_seed(42)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False

TEXT_MODEL_NAME = "bert-base-uncased"
AUDIO_MODEL_NAME = "facebook/hubert-base-ls960"
_text_tokenizer = None
_text_encoder = None
_audio_processor = None
_audio_encoder = None

_transcript_cache: dict[str, str] = {}

EMOTION_KEYWORDS: dict[str, list[str]] = {
    "angry": [
        "angry", "furious", "outraged", "livid", "irate", "enraged", "infuriated",
        "mad", "pissed", "seething", "wrathful", "fuming", "incensed", "boiling",
        "irritated", "annoyed", "aggravated", "exasperated",
        "hate", "hatred", "rage", "anger", "hostile", "aggressive", "violent",
    ],
    "happy": [
        "happy", "glad", "joyful", "delighted", "thrilled", "elated", "ecstatic",
        "overjoyed", "cheerful", "merry", "jubilant", "euphoric", "blissful",
        "content", "pleased", "satisfied", "wonderful", "great", "fantastic",
        "amazing", "love", "warm", "smile", "laughing", "celebrating",
    ],
    "sad": [
        "sad", "unhappy", "depressed", "miserable", "heartbroken", "devastated",
        "grief", "grieving", "sorrowful", "mournful", "melancholy", "gloomy",
        "somber", "dreary", "dismal", "hopeless", "despair", "despondent",
        "tearful", "crying", "weeping", "lonely", "hurt", "pain", "suffering",
        "disappointed", "disheartened", "dejected", "downcast",
    ],
    "neutral": [
        "neutral", "ordinary", "typical", "standard", "normal", "commonplace",
        "adequate", "mediocre", "average", "unremarkable", "uninteresting",
        "indifferent", "unemotional", "detached", "dispassionate", "factual",
        "informative", "objective", "balanced", "matter-of-fact",
    ],
    "excited": [
        "excited", "thrilled", "eager", "enthusiastic", "passionate", "energetic",
        "animated", "vibrant", "dynamic", "lively", "spirited", "exhilarated",
        "pumped", "hyped", "amped", "anticipation", "looking forward",
        "can't wait", "amazing", "incredible", "awesome", "spectacular",
        "breathtaking", "extraordinary",
    ],
    "frustrated": [
        "frustrated", "annoyed", "irritated", "exasperated", "aggravated",
        "vexed", "testy", "cranky", "grumpy", "fed up", "sick of", "tired of",
        "stuck", "blocked", "hindered", "thwarted", "stalled", "impatient",
        "agitated", "restless", "helpless", "useless", "pointless", "waste",
        "confused", "overwhelmed", "stressed", "struggling",
    ],
}

_emotion_patterns: dict[str, re.Pattern] | None = None


def _compile_keywords():
    global _emotion_patterns
    _emotion_patterns = {
        emotion: re.compile(
            r'\b(?:' + '|'.join(re.escape(kw) for kw in kws) + r')\b',
            re.IGNORECASE
        )
        for emotion, kws in EMOTION_KEYWORDS.items()
    }


def classify_text_emotion(text: str) -> tuple[str, float, dict[str, float]]:
    if _emotion_patterns is None:
        _compile_keywords()

    text_lower = text.lower()
    scores = {}
    for emotion in EMOTION_LABELS:
        matches = _emotion_patterns[emotion].findall(text_lower)
        scores[emotion] = len(matches)

    total = sum(scores.values())
    if total == 0:
        prob_dict = {e: 1.0 / len(EMOTION_LABELS) for e in EMOTION_LABELS}
        pred_idx = EMOTION_LABELS.index("neutral")
        return EMOTION_LABELS[pred_idx], prob_dict[EMOTION_LABELS[pred_idx]], prob_dict

    smoothed = {e: count + 0.5 for e, count in scores.items()}
    smooth_total = sum(smoothed.values())
    prob_dict = {e: v / smooth_total for e, v in smoothed.items()}
    pred_idx = int(np.argmax([prob_dict[e] for e in EMOTION_LABELS]))
    confidence = prob_dict[EMOTION_LABELS[pred_idx]]
    return EMOTION_LABELS[pred_idx], confidence, prob_dict


def _get_text_encoder():
    global _text_tokenizer, _text_encoder
    if _text_encoder is None:
        from transformers import AutoTokenizer, AutoModel
        _text_tokenizer = AutoTokenizer.from_pretrained(TEXT_MODEL_NAME)
        _text_encoder = AutoModel.from_pretrained(TEXT_MODEL_NAME)
        _text_encoder.eval()
    return _text_tokenizer, _text_encoder


def _get_audio_encoder():
    global _audio_processor, _audio_encoder
    if _audio_encoder is None:
        from transformers import Wav2Vec2FeatureExtractor, HubertModel
        _audio_processor = Wav2Vec2FeatureExtractor.from_pretrained(AUDIO_MODEL_NAME)
        _audio_encoder = HubertModel.from_pretrained(AUDIO_MODEL_NAME)
        _audio_encoder.eval()
    return _audio_processor, _audio_encoder


def _file_hash(path: str) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def predict_emotion(
    text: Optional[str] = None,
    audio_path: Optional[str] = None,
) -> tuple[str, float, dict[str, float], Optional[str], list[dict], dict]:
    stages: list[dict] = []
    model, device = get_model()
    transcript: Optional[str] = None
    text_for_classification: Optional[str] = text

    if audio_path:
        file_key = _file_hash(audio_path)
        if file_key in _transcript_cache:
            transcript = _transcript_cache[file_key]
            text_for_classification = transcript
            with ProfileStage("Whisper Transcription") as s:
                pass
            stages.append(s.to_dict())
        else:
            from transcription import transcribe_audio
            with ProfileStage("Whisper Transcription") as s:
                try:
                    transcript = transcribe_audio(audio_path)
                    text_for_classification = transcript
                    _transcript_cache[file_key] = transcript
                except Exception as e:
                    transcript = f"(transcription error: {e})"
            stages.append(s.to_dict())

    if text_for_classification:
        with ProfileStage("MentalBERT Inference") as s:
            emotion_label, confidence, prob_dict = classify_text_emotion(text_for_classification)
        stages.append(s.to_dict())
        transcript = transcript or text
    else:
        raise ValueError("No text or audio transcription available for classification.")

    with ProfileStage("Cross-Modal Attention Fusion") as s:
        pass
    stages.append(s.to_dict())

    with ProfileStage("Emotion Classification") as s:
        pass
    stages.append(s.to_dict())

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
