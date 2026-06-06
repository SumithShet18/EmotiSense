import importlib
from config import MODEL_PATH, DEVICE, DEMO_MODE


class DemoModel:
    def __init__(self, num_classes: int = 6):
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

        def forward(self, text_features, audio_features):
            text_features = text_features.unsqueeze(1)
            audio_features = audio_features.unsqueeze(1)
            attended, _ = self.attention(query=text_features, key=audio_features, value=audio_features)
            return attended.squeeze(1)

    class EmotiSenseModel(nn.Module):
        def __init__(self, embed_dim=768, num_heads=8, num_classes=6, dropout=0.3):
            super().__init__()
            self.cross_attention = CrossAttentionFusion(embed_dim, num_heads, dropout)
            self.classifier = nn.Sequential(
                nn.Linear(embed_dim, 256),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(256, num_classes),
            )

        def forward(self, text_features=None, audio_features=None):
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
            _cache.instance = DemoModel(num_classes=6)
            _cache.device = "cpu"
            _cache.demo = True
            return _cache.instance, _cache.device
        raise FileNotFoundError(
            f"Model checkpoint not found at {MODEL_PATH}. "
            "Place your trained best_model.pth in the models/ directory "
            "or set EMOTISENSE_DEMO=true for demo mode."
        )

    torch = importlib.import_module("torch")
    device = torch.device(DEVICE)
    EmotiSenseModel = _build_model()
    model = EmotiSenseModel(embed_dim=768, num_heads=8, num_classes=6, dropout=0.3)

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
