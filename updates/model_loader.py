import importlib
from pathlib import Path
from config import MODEL_PATH, DEVICE, DEMO_MODE, EMOTION_LABELS

# These must match what train_finetune.py was actually run with.
TEXT_MODEL_NAME = "bert-base-uncased"
AUDIO_MODEL_NAME = "facebook/hubert-base-ls960"

# Emotion classes merged from the original 6 down to 5: "excited" folded into
# "happy" because they were nearly indistinguishable in practice (see
# per-class F1 from the IEMOCAP-only run — "happy" F1 was 0.22, the worst
# class by far, with most confusion going to/from "excited"/"neutral").
# This is the standard 5-class IEMOCAP protocol used in most published work,
# not an ad-hoc simplification.
#
# IMPORTANT: this means config.py's EMOTION_LABELS must also be updated to
# ["angry", "happy", "sad", "neutral", "frustrated"] (5 items, this exact
# order) — see the updated config.py provided alongside this file. If
# config.py still has the old 6-class list, this will silently break: the
# model outputs 5 logits but the app will try to label them with 6 names.


class DemoModel:
    def __init__(self, num_classes: int = 5):
        self.num_classes = num_classes
        self.training = False

    def __call__(self, **kwargs):
        import numpy as np
        logits = np.random.randn(1, self.num_classes).astype(np.float32)
        import torch
        return torch.from_numpy(logits)

    def eval(self):
        return self

    def to(self, *args, **kwargs):
        return self


def _build_model():
    torch = importlib.import_module("torch")
    nn = importlib.import_module("torch.nn")

    class CrossAttentionFusion(nn.Module):
        def __init__(self, embed_dim=768, num_heads=8, dropout=0.1):
            super().__init__()
            self.attention = nn.MultiheadAttention(embed_dim, num_heads, dropout, batch_first=True)
            # A learned gate lets the model decide, per sample, how much of
            # the audio-attended signal to blend in — audio doesn't always
            # help (e.g. flat delivery, noisy recording), so this is safer
            # than always trusting it equally.
            self.gate = nn.Linear(embed_dim * 2, embed_dim)
            self.norm = nn.LayerNorm(embed_dim)

        def forward(self, text_features, audio_features):
            text_q = text_features.unsqueeze(1)
            audio_kv = audio_features.unsqueeze(1)
            attended, _ = self.attention(query=text_q, key=audio_kv, value=audio_kv)
            attended = attended.squeeze(1)

            # CRITICAL FIX: the previous version returned `attended` alone,
            # which is purely a function of audio's value vectors — it fully
            # discarded the original text embedding. That's why fusion
            # underperformed text_only in testing: it structurally couldn't
            # preserve the stronger modality's signal. This residual +
            # gate lets text's information survive, with audio only added
            # in proportion to how useful the gate learns it to be.
            gate = torch.sigmoid(self.gate(torch.cat([text_features, attended], dim=-1)))
            fused = text_features + gate * attended
            return self.norm(fused)

    class EmotiSenseModel(nn.Module):
        def __init__(self, embed_dim=768, num_heads=8, num_classes=5, dropout=0.3):
            super().__init__()
            # Raw BERT/HuBERT outputs live on different scales; normalizing
            # each modality before fusion/classification is a standard,
            # essentially-free correction (was missing before).
            self.text_norm = nn.LayerNorm(embed_dim)
            self.audio_norm = nn.LayerNorm(embed_dim)
            self.cross_attention = CrossAttentionFusion(embed_dim, num_heads, dropout)
            self.classifier = nn.Sequential(
                nn.Linear(embed_dim, 256),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(256, num_classes),
            )

        def forward(self, text_features=None, audio_features=None):
            if text_features is not None:
                text_features = self.text_norm(text_features)
            if audio_features is not None:
                audio_features = self.audio_norm(audio_features)

            if text_features is not None and audio_features is not None:
                fused = self.cross_attention(text_features, audio_features)
            elif text_features is not None:
                fused = text_features
            elif audio_features is not None:
                fused = audio_features
            else:
                raise ValueError("At least one of text_features or audio_features must be provided.")
            return self.classifier(fused)

    return EmotiSenseModel


class _ModelCache:
    instance = None
    device = None
    demo = False

_cache = _ModelCache()


def load_model():
    if _cache.instance is not None:
        return _cache.instance, _cache.device

    if not MODEL_PATH.exists():
        if DEMO_MODE:
            _cache.instance = DemoModel(num_classes=len(EMOTION_LABELS))
            _cache.device = "cpu"
            _cache.demo = True
            return _cache.instance, _cache.device
        raise FileNotFoundError(
            f"Model checkpoint not found at {MODEL_PATH}. "
            "Place your fine-tuned mindlens_finetuned.pth there, "
            "or set EMOTISENSE_DEMO=true for demo mode."
        )

    torch = importlib.import_module("torch")
    device = torch.device(DEVICE)

    # Loads the FULL model (fine-tuned BERT + fine-tuned HuBERT + fusion
    # head) — not just the head. The freeze/unfreeze layer counts passed
    # here don't need to match training exactly (they only affect
    # requires_grad flags, not parameter shapes), so this is safe as long
    # as the base model names match what training used.
    from full_model import build_full_model
    model = build_full_model(
        model_loader_path=str(Path(__file__).resolve().parent),
        text_model_name=TEXT_MODEL_NAME,
        audio_model_name=AUDIO_MODEL_NAME,
        num_classes=len(EMOTION_LABELS),
    )

    checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
    if "model_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["model_state_dict"])
    elif "state_dict" in checkpoint:
        model.load_state_dict(checkpoint["state_dict"])
    else:
        model.load_state_dict(checkpoint)

    model.to(device)
    model.eval()

    _cache.instance = model
    _cache.device = device
    _cache.demo = False

    return model, device


def get_model():
    if _cache.instance is None:
        return load_model()
    return _cache.instance, _cache.device


def unload_model():
    _cache.instance = None
    _cache.device = None
    try:
        torch = importlib.import_module("torch")
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except ImportError:
        pass
