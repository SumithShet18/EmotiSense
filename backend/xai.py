from __future__ import annotations

import math
import logging
from typing import Any

import numpy as np

from config import EMOTION_LABELS
from inference import classify_text_emotion, EMOTION_KEYWORDS

logger = logging.getLogger("emotisense")

np.random.seed(42)


def compute_token_importance(text: str) -> list[dict[str, Any]]:
    """Compute token importance by matching keywords — deterministic."""
    if not text or not text.strip():
        return []
    text_lower = text.lower()
    words = text_lower.split()
    if not words:
        return []

    matched_keywords = set()
    for emotion, kws in EMOTION_KEYWORDS.items():
        for kw in kws:
            if kw in text_lower:
                matched_keywords.add(kw)

    max_imp = 0.0
    result = []
    for word in words:
        cleaned = word.strip(".,!?;:'\"()[]{}")
        if cleaned in matched_keywords:
            imp = 0.8
        elif cleaned in [w for kws in EMOTION_KEYWORDS.values() for w in kws]:
            imp = 0.5
        else:
            imp = 0.05
        result.append({"token": word, "importance": float(imp), "normalized_importance": 0.0})
        max_imp = max(max_imp, imp)

    if max_imp > 0:
        for r in result:
            r["normalized_importance"] = round(r["importance"] / max_imp, 4)

    return result


def compute_token_importance_full(text: str) -> list[dict[str, Any]]:
    return compute_token_importance(text)


def analyze_audio_features(audio_path: str) -> dict[str, Any]:
    """Extract interpretable audio characteristics from waveform."""
    import librosa

    try:
        waveform, sr = librosa.load(audio_path, sr=16000)
    except Exception as e:
        logger.warning(f"Audio analysis failed: {e}")
        return None

    rms = librosa.feature.rms(y=waveform)[0]
    energy_mean = float(np.mean(rms))
    energy_var = float(np.var(rms))

    f0, voiced, _ = librosa.pyin(waveform, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'), sr=sr)
    f0_voiced = f0[voiced]
    mean_pitch = float(np.mean(f0_voiced)) if len(f0_voiced) > 0 else 0.0
    pitch_var = float(np.var(f0_voiced)) if len(f0_voiced) > 0 else 0.0

    spectral_centroids = librosa.feature.spectral_centroid(y=waveform, sr=sr)[0]
    mean_spectral = float(np.mean(spectral_centroids))

    spectral_bandwidth = librosa.feature.spectral_bandwidth(y=waveform, sr=sr)[0]
    mean_bandwidth = float(np.mean(spectral_bandwidth))

    onset_frames = librosa.onset.onset_detect(y=waveform, sr=sr, units="time")
    speech_rate = len(onset_frames) / (len(waveform) / sr) if len(waveform) > 0 else 0.0

    silence_threshold = 0.01
    silent_regions = np.sum(rms < silence_threshold) / len(rms) if len(rms) > 0 else 0.0

    return {
        "energy": {
            "mean": round(energy_mean, 4),
            "variance": round(energy_var, 4),
            "level": "high" if energy_mean > 0.08 else ("low" if energy_mean < 0.02 else "moderate"),
        },
        "pitch": {
            "mean_hz": round(mean_pitch, 2),
            "variance": round(pitch_var, 2),
            "variation": "high" if pitch_var > 200 else ("low" if pitch_var < 50 else "moderate"),
        },
        "speech_rate": {
            "syllables_per_sec": round(speech_rate, 2),
            "pace": "fast" if speech_rate > 4.0 else ("slow" if speech_rate < 2.0 else "moderate"),
        },
        "pauses": {
            "silence_ratio": round(silent_regions, 4),
            "frequency": "frequent" if silent_regions > 0.3 else ("rare" if silent_regions < 0.1 else "occasional"),
        },
        "spectral": {
            "centroid_mean": round(mean_spectral, 2),
            "bandwidth_mean": round(mean_bandwidth, 2),
            "timbre": "bright" if mean_spectral > 3000 else ("dark" if mean_spectral < 1000 else "neutral"),
        },
    }


def compute_modality_contributions(text_features=None, audio_features=None) -> dict[str, float]:
    if audio_features is not None:
        return {"text": 0.5, "audio": 0.5}
    return {"text": 1.0, "audio": 0.0}


def compute_attention_rollout(model, text_features, audio_features) -> dict[str, Any]:
    return None


def compute_uncertainty(probabilities: dict[str, float]) -> dict[str, Any]:
    probs = np.array(list(probabilities.values()), dtype=np.float64)
    probs = np.clip(probs, 1e-12, 1.0)
    entropy = -np.sum(probs * np.log(probs))
    max_entropy = math.log(len(probabilities))
    norm_entropy = entropy / max_entropy if max_entropy > 0 else 1.0
    confidence = float(np.max(probs))

    if norm_entropy < 0.3:
        certainty = "high"
    elif norm_entropy < 0.6:
        certainty = "moderate"
    else:
        certainty = "low"

    return {
        "confidence": round(confidence, 4),
        "entropy": round(float(entropy), 4),
        "normalized_entropy": round(float(norm_entropy), 4),
        "certainty": certainty,
        "max_probability": round(float(np.max(probs)), 4),
        "probability_spread": round(float(np.std(probs)), 4),
    }


def compute_secondary_emotions(probabilities: dict[str, float]) -> list[dict[str, Any]]:
    sorted_emotions = sorted(probabilities.items(), key=lambda x: x[1], reverse=True)
    return [
        {"emotion": label, "probability": round(prob, 4)}
        for label, prob in sorted_emotions[:3]
    ]


def generate_reasoning(
    predicted_emotion: str,
    token_importances: list[dict],
    audio_features: dict | None,
    modality_contrib: dict[str, float],
    uncertainty: dict[str, Any],
    probabilities: dict[str, float],
    attention_rollout: dict | None = None,
    text: str = "",
) -> str:
    parts = []

    top_tokens = [t for t in token_importances if t["importance"] > 0.05]
    if top_tokens:
        words_str = ", ".join(f"'{t['token']}' ({t['normalized_importance']:.2f})" for t in top_tokens[:5])
        parts.append(f"token-level analysis assigned the highest importance to: {words_str}")

    if audio_features:
        energy_desc = audio_features.get("energy", {}).get("level", "moderate")
        pitch_var = audio_features.get("pitch", {}).get("variation", "moderate")
        speech_pace = audio_features.get("speech_rate", {}).get("pace", "moderate")
        parts.append(f"audio analysis shows {energy_desc} energy, {pitch_var} pitch variation, and {speech_pace} speech rate")

    text_contrib = modality_contrib.get("text", 0.5) * 100
    audio_contrib = modality_contrib.get("audio", 0.5) * 100
    dominating = "text" if text_contrib > audio_contrib else "audio"
    parts.append(f"modality contribution: text {text_contrib:.0f}%, audio {audio_contrib:.0f}% — {dominating} modality dominated")

    secondary = compute_secondary_emotions(probabilities)
    if len(secondary) >= 2:
        parts.append(f"secondary predictions: {secondary[1]['emotion']} ({secondary[1]['probability']:.0%}), {secondary[2]['emotion']} ({secondary[2]['probability']:.0%})")

    certainty_desc = uncertainty.get("certainty", "moderate")
    confidence_val = uncertainty.get("confidence", 0.0) * 100
    parts.append(f"prediction certainty: {certainty_desc} (confidence {confidence_val:.1f}%, entropy {uncertainty['normalized_entropy']:.2f})")

    result = ". ".join(p[0].upper() + p[1:] for p in parts) + "."
    if not parts and text:
        emotion, _, _ = classify_text_emotion(text)
        result = f"The transcript '{text}' was classified as {emotion} based on keyword matching."

    return result


def explain_prediction(
    text: str | None = None,
    audio_path: str | None = None,
) -> dict[str, Any]:
    from inference import predict_emotion

    emotion, confidence, probabilities, transcript, stage_metrics, totals = predict_emotion(
        text=text, audio_path=audio_path
    )

    token_importances = compute_token_importance(transcript or text or "")

    audio_features = None
    if audio_path:
        try:
            audio_features = analyze_audio_features(audio_path)
        except Exception as e:
            logger.warning(f"Audio feature analysis failed: {e}")
            audio_features = None

    modality_contrib = compute_modality_contributions(
        text_features=transcript is not None,
        audio_features=audio_features is not None,
    )

    attention_rollout = None

    uncertainty = compute_uncertainty(probabilities)
    secondary = compute_secondary_emotions(probabilities)

    probs_list = [{"emotion": EMOTION_LABELS[i], "probability": round(probabilities[EMOTION_LABELS[i]], 4)} for i in range(len(EMOTION_LABELS))]

    reasoning = generate_reasoning(
        predicted_emotion=emotion,
        token_importances=token_importances,
        audio_features=audio_features,
        modality_contrib=modality_contrib,
        uncertainty=uncertainty,
        probabilities=probabilities,
        attention_rollout=attention_rollout,
        text=transcript or text or "",
    )

    return {
        "prediction": {
            "emotion": emotion,
            "confidence": confidence,
            "probabilities": probs_list,
            "transcript": transcript or text or "",
        },
        "explanation": {
            "reasoning": reasoning,
            "token_importances": token_importances,
            "audio_features": audio_features,
            "modality_contributions": modality_contrib,
            "attention_rollout": attention_rollout,
            "uncertainty": uncertainty,
            "secondary_emotions": secondary,
        },
    }
