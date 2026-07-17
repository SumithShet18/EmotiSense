import torch
import torch.nn as nn
import numpy as np


def compute_attention_rollout(attentions, attention_mask=None):
    if attentions is None:
        return None
    n_layers = len(attentions)
    seq_len = attentions[0].shape[-1]
    device = attentions[0].device

    rollout = torch.eye(seq_len, device=device)
    for layer_attn in attentions:
        avg_attn = layer_attn.mean(dim=1).squeeze(0)
        avg_attn = avg_attn + torch.eye(seq_len, device=device)
        avg_attn = avg_attn / avg_attn.sum(dim=-1, keepdim=True)
        rollout = rollout @ avg_attn

    token_scores = rollout[0]
    if attention_mask is not None:
        mask = attention_mask.squeeze(0).float()
        token_scores = token_scores * mask
    return token_scores


def compute_cross_modal_attention(attn_weights):
    if attn_weights is None:
        return {"aggregated": 0.5, "per_head": [0.5] * 8}
    attn = attn_weights.detach().cpu()
    per_head = attn.squeeze().tolist()
    if isinstance(per_head, list):
        aggregated = float(np.mean(per_head))
    else:
        aggregated = float(per_head)
        per_head = [per_head]
    return {"aggregated": round(aggregated, 4), "per_head": [round(h, 4) for h in per_head]}


def compute_gate_distribution(gate_vector):
    if gate_vector is None:
        return {"p10": 0.0, "p50": 0.0, "p90": 0.0, "mean": 0.0, "std": 0.0}
    g = gate_vector.detach().cpu().numpy()
    return {
        "p10": round(float(np.percentile(g, 10)), 4),
        "p50": round(float(np.percentile(g, 50)), 4),
        "p90": round(float(np.percentile(g, 90)), 4),
        "mean": round(float(np.mean(g)), 4),
        "std": round(float(np.std(g)), 4),
    }


def compute_audio_weight(gate_vector):
    if gate_vector is None:
        return 0.0
    g = gate_vector.detach().cpu().numpy()
    return round(float(np.mean(g)), 4)


def _ig_text_tokens(model, input_ids, attention_mask, label_idx, steps=32):
    embed = model.text_encoder.embeddings
    input_embeds = embed(input_ids)
    baseline = torch.zeros_like(input_embeds)
    alphas = torch.linspace(0, 1, steps, device=input_ids.device)

    total_grad = torch.zeros_like(input_embeds)
    for alpha in alphas:
        embeds = baseline + alpha * (input_embeds - baseline)
        embeds.requires_grad_(True)
        out = model.text_encoder(inputs_embeds=embeds, attention_mask=attention_mask, output_attentions=False)
        hidden = out.last_hidden_state
        mask = attention_mask.unsqueeze(-1).float()
        pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-9)
        logits = model.head(text_features=pooled)
        model.zero_grad()
        logits[0, label_idx].backward()
        total_grad += embeds.grad

    ig = (input_embeds - baseline) * total_grad / steps
    token_ig = ig.sum(dim=-1).squeeze(0)
    mask = attention_mask.squeeze(0).bool()
    return token_ig


def _ig_audio_segments(model, input_values, attention_mask_audio, label_idx):
    if input_values is None:
        return []
    n_samples = input_values.shape[-1]
    segment_len = 16000
    n_segments = (n_samples + segment_len - 1) // segment_len
    n_segments = min(n_segments, 6)

    baseline = torch.zeros_like(input_values)
    baseline_logits = model(input_values=baseline, attention_mask_audio=attention_mask_audio)
    baseline_prob = torch.softmax(baseline_logits, dim=-1)[0, label_idx].item()

    full_logits = model(input_values=input_values, attention_mask_audio=attention_mask_audio)
    full_prob = torch.softmax(full_logits, dim=-1)[0, label_idx].item()

    segments = []
    for seg_idx in range(n_segments):
        start = seg_idx * segment_len
        end = min(start + segment_len, n_samples)
        masked = input_values.clone()
        masked[..., start:end] = 0
        masked_logits = model(input_values=masked, attention_mask_audio=attention_mask_audio)
        masked_prob = torch.softmax(masked_logits, dim=-1)[0, label_idx].item()
        attribution = full_prob - masked_prob
        segments.append({
            "start_s": round(seg_idx, 1),
            "end_s": round(seg_idx + 1, 1),
            "attribution": round(attribution, 4),
        })

    if segments:
        max_abs = max(abs(s["attribution"]) for s in segments) or 1
        for s in segments:
            s["normalized"] = round(s["attribution"] / max_abs, 4)

    return segments


def compute_faithful_attribution(model, input_ids, attention_mask_text, input_values, attention_mask_audio, label_idx, steps=32):
    model.eval()

    text_attribs = None
    audio_attribs = None
    baseline_probs = None

    if input_ids is not None:
        token_ig = _ig_text_tokens(model, input_ids, attention_mask_text, label_idx, steps)
        mask = attention_mask_text.squeeze(0).bool()
        full_seq = token_ig
        real_idx = torch.where(mask)[0]
        full_scores = full_seq[real_idx].tolist()
        tokenizer = model.text_encoder.config
        from transformers import AutoTokenizer
        tok = AutoTokenizer.from_pretrained("bert-base-uncased")
        tokens = tok.convert_ids_to_tokens(input_ids.squeeze(0)[real_idx])
        max_abs = max(abs(s) for s in full_scores) or 1
        text_attribs = [
            {"token": t, "attribution": round(s, 4), "normalized": round(s / max_abs, 4), "rank": i + 1}
            for i, (t, s) in enumerate(sorted(zip(tokens, full_scores), key=lambda x: -abs(x[1])))
        ]

    if input_values is not None:
        audio_attribs = _ig_audio_segments(model, input_values, attention_mask_audio, label_idx)

    with torch.no_grad():
        inputs = {}
        if input_ids is not None:
            inputs["input_ids"] = torch.zeros_like(input_ids)
            inputs["attention_mask_text"] = attention_mask_text
        if input_values is not None:
            inputs["input_values"] = torch.zeros_like(input_values)
            if attention_mask_audio is not None:
                inputs["attention_mask_audio"] = attention_mask_audio
        baseline_logits = model(**inputs)
        baseline_probs = {str(i): round(float(baseline_logits[0, i]), 4) for i in range(baseline_logits.shape[-1])}

    return text_attribs, audio_attribs, baseline_probs
