def generate_reasoning(
    predicted_emotion: str,
    text_token_attention: list,
    audio_features: dict | None,
    modality_gate: dict,
    uncertainty: dict,
    probabilities: dict[str, float],
    text: str = "",
    cross_modal_attention: dict | None = None,
) -> str:
    parts = []
    language_label = "high" if uncertainty.get("normalized_entropy", 1) < 0.3 else ("moderate" if uncertainty.get("normalized_entropy", 1) < 0.6 else "low")
    certainty_map = {"high": "strong conviction", "moderate": "reasonable confidence", "low": "notable uncertainty"}
    certainty_phrase = certainty_map.get(uncertainty.get("certainty", "moderate"), "reasonable confidence")

    parts.append(
        f"The model identified {predicted_emotion} as the primary emotional state "
        f"with {uncertainty.get('confidence', 0) * 100:.0f}% confidence "
        f"({certainty_phrase})."
    )

    top_tokens = [t for t in text_token_attention if t.get("weight", 0) > 0.01][:5]
    if top_tokens:
        tokens_str = ", ".join(f"'{t['token']}' (weight {t['weight']:.3f})" for t in top_tokens)
        parts.append(f"Token-level attention analysis highlights: {tokens_str}")

    if audio_features:
        energy_desc = audio_features.get("energy", {}).get("level", "moderate")
        pitch_var = audio_features.get("pitch", {}).get("variation", "moderate")
        speech_pace = audio_features.get("speech_rate", {}).get("pace", "moderate")
        parts.append(f"Audio analysis shows {energy_desc} energy, {pitch_var} pitch variation, and {speech_pace} speech rate")

    if modality_gate:
        text_w = 1 - modality_gate.get("audio_weight", 0)
        audio_w = modality_gate.get("audio_weight", 0)
        if text_w > audio_w + 0.1:
            dominance = "text modality dominated the prediction"
        elif audio_w > text_w + 0.1:
            dominance = "audio modality dominated the prediction"
        else:
            dominance = "both modalities contributed approximately equally"
        parts.append(f"The fusion gate assigned {audio_w * 100:.0f}% weight to audio — {dominance}")

    secondary = [(e, p) for e, p in sorted(probabilities.items(), key=lambda x: -x[1]) if e != predicted_emotion]
    if secondary and secondary[0][1] > 0.07:
        parts.append(f"The strongest secondary signal was {secondary[0][0]} ({secondary[0][1] * 100:.0f}%)")

    result = ". ".join(s[0].upper() + s[1:] for s in parts) + "."
    return result
