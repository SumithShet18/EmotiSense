from typing import Optional

import numpy as np

from config import EMOTION_LABELS
from model_loader import get_model, _cache
from performance_profiler import ProfileStage, measure_memory, measure_cpu


def predict_emotion(
    text: Optional[str] = None,
    audio_path: Optional[str] = None,
) -> tuple[str, float, dict[str, float], Optional[str], list[dict], dict]:
    """
    Predict emotion from text and/or audio.

    Returns:
        (emotion_label, confidence, probabilities_dict, transcript, stage_metrics, totals)
    """
    stages: list[dict] = []
    model, device = get_model()

    transcript: Optional[str] = None

    if _cache.demo:
        rng = np.random.default_rng()
        probs = rng.dirichlet(np.ones(len(EMOTION_LABELS)))
        pred_idx = int(np.argmax(probs))
        confidence = float(probs[pred_idx])
        emotion_label = EMOTION_LABELS[pred_idx]
        prob_dict = {EMOTION_LABELS[i]: float(probs[i]) for i in range(len(EMOTION_LABELS))}
        transcript = text or "(demo transcription)"

        # Build demo performance metrics
        with ProfileStage("Whisper Transcription") as s:
            import time as _t
            _t.sleep(0.05)
        stages.append(s.to_dict())
        with ProfileStage("MentalBERT Inference") as s:
            _t.sleep(0.03)
        stages.append(s.to_dict())
        with ProfileStage("HuBERT Inference") as s:
            _t.sleep(0.04)
        stages.append(s.to_dict())
        with ProfileStage("Cross-Modal Attention Fusion") as s:
            _t.sleep(0.01)
        stages.append(s.to_dict())
        with ProfileStage("Emotion Classification") as s:
            _t.sleep(0.002)
        stages.append(s.to_dict())

        total_latency = sum(s["latency_ms"] for s in stages)
        total_energy = sum(s["energy_joules"] for s in stages)
        peak_memory = max(s["memory_mb"] for s in stages)
        avg_cpu = round(sum(s["cpu_usage"] for s in stages) / len(stages), 2)
        throughput = round(1000 / total_latency, 2) if total_latency > 0 else 0.0

        totals = {
            "total_latency_ms": round(total_latency, 2),
            "total_energy_joules": round(total_energy, 4),
            "peak_memory_mb": round(peak_memory, 2),
            "avg_cpu_usage": avg_cpu,
            "throughput_inferences_per_sec": throughput,
        }

        return emotion_label, confidence, prob_dict, transcript, stages, totals

    import torch
    from transformers import AutoTokenizer, AutoModel
    from transformers import Wav2Vec2FeatureExtractor, HubertModel
    import librosa
    from config import SAMPLE_RATE
    from transcription import transcribe_audio

    TEXT_MODEL_NAME = "bert-base-uncased"
    _text_tokenizer = None
    _text_encoder = None

    def _get_text_encoder():
        nonlocal _text_tokenizer, _text_encoder
        if _text_encoder is None:
            _text_tokenizer = AutoTokenizer.from_pretrained(TEXT_MODEL_NAME)
            _text_encoder = AutoModel.from_pretrained(TEXT_MODEL_NAME)
            _text_encoder.eval()
        return _text_tokenizer, _text_encoder

    def preprocess_text(text: str) -> torch.Tensor:
        tokenizer, encoder = _get_text_encoder()
        inputs = tokenizer(
            text,
            padding="max_length",
            truncation=True,
            max_length=128,
            return_tensors="pt",
        )
        with torch.no_grad():
            outputs = encoder(**inputs)
        features = outputs.last_hidden_state[:, 0, :]
        return features

    AUDIO_MODEL_NAME = "facebook/hubert-base-ls960"
    _audio_processor = None
    _audio_encoder = None

    def _get_audio_encoder():
        nonlocal _audio_processor, _audio_encoder
        if _audio_encoder is None:
            _audio_processor = Wav2Vec2FeatureExtractor.from_pretrained(AUDIO_MODEL_NAME)
            _audio_encoder = HubertModel.from_pretrained(AUDIO_MODEL_NAME)
            _audio_encoder.eval()
        return _audio_processor, _audio_encoder

    def preprocess_audio(audio_path: str) -> torch.Tensor:
        processor, encoder = _get_audio_encoder()
        waveform, sr = librosa.load(audio_path, sr=SAMPLE_RATE)
        inputs = processor(
            waveform,
            sampling_rate=SAMPLE_RATE,
            return_tensors="pt",
        )
        with torch.no_grad():
            outputs = encoder(**inputs)
        features = outputs.last_hidden_state.mean(dim=1)
        return features

    resolved_text = text

    # Stage 1: Whisper Transcription
    if audio_path and not resolved_text:
        with ProfileStage("Whisper Transcription") as s:
            transcript = transcribe_audio(audio_path)
            resolved_text = transcript
        stages.append(s.to_dict())
    elif audio_path and resolved_text:
        transcript = resolved_text

    text_tensor: Optional[torch.Tensor] = None
    audio_tensor: Optional[torch.Tensor] = None

    # Stage 2: MentalBERT Inference
    if resolved_text:
        with ProfileStage("MentalBERT Inference") as s:
            text_tensor = preprocess_text(resolved_text)
        stages.append(s.to_dict())

    # Stage 3: HuBERT Inference
    if audio_path:
        with ProfileStage("HuBERT Inference") as s:
            audio_tensor = preprocess_audio(audio_path)
        stages.append(s.to_dict())

    if text_tensor is None and audio_tensor is None:
        raise ValueError("At least one of text or audio must be provided.")

    # Stage 4: Cross-Modal Attention Fusion
    with ProfileStage("Cross-Modal Attention Fusion") as s:
        logits = model(text_features=text_tensor, audio_features=audio_tensor)
    stages.append(s.to_dict())

    # Stage 5: Emotion Classification
    with ProfileStage("Emotion Classification") as s:
        probabilities = torch.softmax(logits, dim=-1)
        probs_np = probabilities.detach().cpu().numpy().flatten()
        pred_idx = int(np.argmax(probs_np))
        confidence = float(probs_np[pred_idx])
        emotion_label = EMOTION_LABELS[pred_idx]
        prob_dict = {EMOTION_LABELS[i]: float(probs_np[i]) for i in range(len(EMOTION_LABELS))}
    stages.append(s.to_dict())

    # Aggregate totals
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
