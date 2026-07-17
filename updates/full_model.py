"""
Full multimodal model for partial fine-tuning: unfreezes only the last N
transformer layers of BERT and HuBERT (rest stays frozen), reusing the exact
fixed gated cross-attention fusion head from model_loader.py.

Why only partial fine-tuning, not full: IEMOCAP is small (~7-8k utterances
after the session split). Fully fine-tuning two ~110M-parameter encoders on
that little data is a near-guaranteed overfitting recipe. Unfreezing just the
last few layers is the standard, well-evidenced middle ground — early layers
keep their general-purpose pretrained representations, only the
task-specific top layers adapt to emotion recognition.
"""

import torch
import torch.nn as nn


def _freeze_all(module: nn.Module):
    for p in module.parameters():
        p.requires_grad = False


def configure_bert_finetuning(bert_model, num_unfrozen_layers: int):
    """Freezes everything, then unfreezes the last N of BertModel.encoder.layer."""
    _freeze_all(bert_model)
    layers = bert_model.encoder.layer
    total = len(layers)
    n = min(num_unfrozen_layers, total)
    for layer in layers[total - n:]:
        for p in layer.parameters():
            p.requires_grad = True
    return n


def configure_hubert_finetuning(hubert_model, num_unfrozen_layers: int):
    """Freezes everything (including the CNN feature extractor — standard
    practice, it stays frozen even in most published HuBERT fine-tuning
    work), then unfreezes the last N of HubertModel.encoder.layers."""
    _freeze_all(hubert_model)
    layers = hubert_model.encoder.layers
    total = len(layers)
    n = min(num_unfrozen_layers, total)
    for layer in layers[total - n:]:
        for p in layer.parameters():
            p.requires_grad = True
    return n


class EmotiSenseFullModel(nn.Module):
    """Bundles the (partially frozen) encoders with the fusion+classifier head.
    `head_model_class` should be the EmotiSenseModel class from model_loader.py,
    so the fusion logic is guaranteed identical to what was already validated."""

    def __init__(self, text_model_name, audio_model_name, head_model_class,
                 num_unfrozen_text_layers=3, num_unfrozen_audio_layers=3,
                 num_classes=5, dropout=0.3):
        super().__init__()
        from transformers import AutoModel, HubertModel

        self.text_encoder = AutoModel.from_pretrained(text_model_name)
        self.audio_encoder = HubertModel.from_pretrained(audio_model_name)

        n_text = configure_bert_finetuning(self.text_encoder, num_unfrozen_text_layers)
        n_audio = configure_hubert_finetuning(self.audio_encoder, num_unfrozen_audio_layers)
        print(f"Unfroze last {n_text} BERT layers, last {n_audio} HuBERT layers")

        # Reuses the exact validated fusion architecture (residual + gate fix).
        self.head = head_model_class(embed_dim=768, num_heads=8, num_classes=num_classes, dropout=dropout)

    def encode_text(self, input_ids, attention_mask):
        hidden = self.text_encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state
        mask = attention_mask.unsqueeze(-1).float()
        return (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-9)

    def encode_audio(self, input_values, attention_mask=None):
        out = self.audio_encoder(input_values=input_values, attention_mask=attention_mask)
        hidden = out.last_hidden_state
        if attention_mask is not None:
            feat_mask = self.audio_encoder._get_feature_vector_attention_mask(
                hidden.shape[1], attention_mask
            ).unsqueeze(-1).float()
            return (hidden * feat_mask).sum(dim=1) / feat_mask.sum(dim=1).clamp(min=1e-9)
        return hidden.mean(dim=1)

    def forward(self, input_ids=None, attention_mask_text=None,
                input_values=None, attention_mask_audio=None):
        text_features = None
        audio_features = None
        if input_ids is not None:
            text_features = self.encode_text(input_ids, attention_mask_text)
        if input_values is not None:
            audio_features = self.encode_audio(input_values, attention_mask_audio)
        return self.head(text_features=text_features, audio_features=audio_features)


def build_full_model(model_loader_path, text_model_name, audio_model_name,
                      num_unfrozen_text_layers=3, num_unfrozen_audio_layers=3,
                      num_classes=5, dropout=0.3):
    import sys
    sys.path.insert(0, model_loader_path)
    from model_loader import _build_model
    EmotiSenseModel = _build_model()
    return EmotiSenseFullModel(
        text_model_name, audio_model_name, EmotiSenseModel,
        num_unfrozen_text_layers, num_unfrozen_audio_layers, num_classes, dropout,
    )
