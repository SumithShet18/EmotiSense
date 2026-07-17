from __future__ import annotations

import math
import logging
from typing import Any

import numpy as np
import torch

from config import EMOTION_LABELS
from inference import predict_emotion, _tensor_cache
from model_loader import get_model
from attribution import (
    compute_attention_rollout,
    compute_faithful_attribution,
)
from audio_features import analyze_audio_features
from narration import generate_reasoning
from xai_schemas import (
    TokenAttention,
    CrossModalAttention,
    ModalityGate,
    InlineExplanation,
    Explanation,
    FaithfulAttribution,
    TokenAttribution,
    AudioSegmentAttribution,
    PredictionInfo,
    XAIResponse,
)

logger = logging.getLogger("emotisense")

np.random.seed(42)


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


def compute_secondary_emotions(predicted_emotion: str, probabilities: dict[str, float]) -> list[dict[str, Any]]:
    sorted_emotions = sorted(probabilities.items(), key=lambda x: x[1], reverse=True)
    return [
        {"emotion": label, "probability": round(prob, 4)}
        for label, prob in sorted_emotions
        if prob > 0.07 and label != predicted_emotion
    ]


def _build_inline_explanation(
    model: Any,
    transcript: str | None,
    audio_path: str | None,
    probabilities: dict[str, float],
    predicted_emotion: str,
    modality_contribution: dict | None = None,
) -> dict:
    text_attentions = getattr(model, '_last_text_attentions', None)

    cached = _tensor_cache.get("last", {})
    input_ids = cached.get("input_ids")
    attention_mask = cached.get("attention_mask_text")

    rollout_scores = compute_attention_rollout(text_attentions, attention_mask)
    word_tokens = []
    if rollout_scores is not None and transcript and input_ids is not None:
        from transformers import AutoTokenizer
        tok = AutoTokenizer.from_pretrained("bert-base-uncased")
        tokens = tok.convert_ids_to_tokens(input_ids.squeeze(0))
        if attention_mask is not None:
            real_idx = torch.where(attention_mask.squeeze(0).bool())[0]
        else:
            real_idx = torch.arange(len(tokens[:128]))
        specials = {"[CLS]", "[SEP]", "[PAD]"}
        scored = []
        for idx in real_idx:
            tidx = idx.item()
            t = tokens[tidx] if tidx < len(tokens) else ""
            if t in specials:
                continue
            s = float(rollout_scores[tidx].item()) if tidx < len(rollout_scores) else 0.0
            scored.append((t, s))
        scored.sort(key=lambda x: -x[1])
        max_s = max((s for _, s in scored), default=1)
        word_tokens = [
            {"token": t, "weight": round(s / max_s, 4), "rank": i + 1}
            for i, (t, s) in enumerate(scored[:12])
        ]

    audio_features = None
    if audio_path:
        try:
            audio_features = analyze_audio_features(audio_path)
        except Exception as e:
            logger.warning(f"Audio feature analysis failed: {e}")

    # Modality contribution from real per-sample L2-norm computation
    if modality_contribution:
        audio_w = modality_contribution["audio_pct"] / 100.0
        text_w = modality_contribution["text_pct"] / 100.0
        gate_dict = {
            "audio_weight": round(audio_w, 4),
            "text_weight": round(text_w, 4),
            "gate_distribution": {
                "mean": modality_contribution.get("gate_mean", 0),
                "p10": 0, "p50": 0, "p90": 0, "std": 0,
            },
        }
    else:
        gate_dict = {
            "audio_weight": 0.0,
            "text_weight": 1.0,
            "gate_distribution": {"p10": 0, "p50": 0, "p90": 0, "mean": 0, "std": 0},
        }

    cross_modal = {"aggregated": 0.5, "per_head": [0.5] * 8}

    uncertainty = compute_uncertainty(probabilities)
    secondary = compute_secondary_emotions(predicted_emotion, probabilities)

    inline = {
        "text_token_attention": word_tokens,
        "cross_modal_attention": cross_modal,
        "modality_gate": gate_dict,
        "audio_features": audio_features,
        "uncertainty": uncertainty,
        "secondary_emotions": secondary,
    }
    return inline


def explain_prediction(
    text: str | None = None,
    audio_path: str | None = None,
) -> dict[str, Any]:
    emotion, confidence, probabilities, transcript, stage_metrics, totals, modality_contribution = predict_emotion(
        text=text, audio_path=audio_path
    )

    model, device = get_model()

    inline = _build_inline_explanation(model, transcript, audio_path, probabilities, emotion, modality_contribution)

    reasoning = generate_reasoning(
        predicted_emotion=emotion,
        text_token_attention=inline["text_token_attention"],
        audio_features=inline["audio_features"],
        modality_gate=inline["modality_gate"],
        uncertainty=inline["uncertainty"],
        probabilities=probabilities,
        text=transcript or text or "",
        cross_modal_attention=inline["cross_modal_attention"],
    )

    probs_list = [{"emotion": EMOTION_LABELS[i], "probability": round(probabilities[EMOTION_LABELS[i]], 4)} for i in range(len(EMOTION_LABELS))]

    return {
        "prediction": {
            "emotion": emotion,
            "confidence": confidence,
            "probabilities": probs_list,
            "transcript": transcript or text or "",
        },
        "explanation": {
            "reasoning": reasoning,
            "inline": inline,
            "faithful": None,
            "ig_convergence": None,
            "ig_steps": None,
        },
    }


def compute_faithful(
    text: str | None = None,
    audio_path: str | None = None,
    steps: int = 32,
) -> dict:
    emotion, confidence, probabilities, transcript, stage_metrics, totals, _modality_contribution = predict_emotion(
        text=text, audio_path=audio_path
    )
    model, _ = get_model()
    pred_idx = EMOTION_LABELS.index(emotion)

    cached = _tensor_cache.get("last", {})
    input_ids = cached.get("input_ids")
    attention_mask_text = cached.get("attention_mask_text")
    input_values = cached.get("input_values")
    attention_mask_audio = cached.get("attention_mask_audio")

    if input_ids is None and input_values is None:
        return {"text_token_attributions": None, "audio_segment_attributions": None, "baseline_prediction": {}}

    text_attribs, audio_attribs, baseline_probs = compute_faithful_attribution(
        model, input_ids, attention_mask_text, input_values, attention_mask_audio, pred_idx, steps
    )

    return {
        "text_token_attributions": text_attribs,
        "audio_segment_attributions": audio_attribs,
        "baseline_prediction": baseline_probs,
    }


def build_xai_response(explanation_dict: dict) -> XAIResponse:
    pred = explanation_dict["prediction"]
    expl = explanation_dict["explanation"]
    inline = expl["inline"]

    inline_model = InlineExplanation(
        text_token_attention=[TokenAttention(**t) for t in inline["text_token_attention"]],
        cross_modal_attention=CrossModalAttention(**inline["cross_modal_attention"]),
        modality_gate=ModalityGate(**inline["modality_gate"]),
        audio_features=inline.get("audio_features"),
        uncertainty=inline["uncertainty"],
        secondary_emotions=inline["secondary_emotions"],
    )

    faithful = expl.get("faithful")
    faithful_model = None
    if faithful is not None:
        text_attribs = faithful.get("text_token_attributions")
        audio_attribs = faithful.get("audio_segment_attributions")
        faithful_model = FaithfulAttribution(
            text_token_attributions=[TokenAttribution(**t) for t in text_attribs] if text_attribs else None,
            audio_segment_attributions=[AudioSegmentAttribution(**s) for s in audio_attribs] if audio_attribs else None,
            baseline_prediction=faithful.get("baseline_prediction", {}),
        )

    explanation_model = Explanation(
        reasoning=expl["reasoning"],
        inline=inline_model,
        faithful=faithful_model,
        ig_convergence=expl.get("ig_convergence"),
        ig_steps=expl.get("ig_steps"),
    )

    return XAIResponse(
        prediction=PredictionInfo(**pred),
        explanation=explanation_model,
    )
