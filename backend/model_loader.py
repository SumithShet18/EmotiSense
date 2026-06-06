import torch
import torch.nn as nn
from config import MODEL_PATH, DEVICE, DEMO_MODE


class CrossAttentionFusion(nn.Module):
    def __init__(self, embed_dim: int = 768, num_heads: int = 8, dropout: float = 0.1):
        super().__init__()
        self.attention = nn.MultiheadAttention(
            embed_dim=embed_dim,
            num_heads=num_heads,
            dropout=dropout,
            batch_first=True,
        )

    def forward(self, text_features: torch.Tensor, audio_features: torch.Tensor) -> torch.Tensor:
        text_features = text_features.unsqueeze(1)
        audio_features = audio_features.unsqueeze(1)
        attended, _ = self.attention(query=text_features, key=audio_features, value=audio_features)
        return attended.squeeze(1)


class EmotiSenseModel(nn.Module):
    def __init__(self, embed_dim: int = 768, num_heads: int = 8, num_classes: int = 6, dropout: float = 0.3):
        super().__init__()
        self.cross_attention = CrossAttentionFusion(embed_dim=embed_dim, num_heads=num_heads, dropout=dropout)
        self.classifier = nn.Sequential(
            nn.Linear(embed_dim, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, num_classes),
        )

    def forward(
        self,
        text_features: torch.Tensor | None = None,
        audio_features: torch.Tensor | None = None,
    ) -> torch.Tensor:
        if text_features is not None and audio_features is not None:
            fused = self.cross_attention(text_features, audio_features)
        elif text_features is not None:
            fused = text_features
        elif audio_features is not None:
            fused = audio_features
        else:
            raise ValueError("At least one of text_features or audio_features must be provided.")
        logits = self.classifier(fused)
        return logits


class DemoModel(nn.Module):
    def __init__(self, num_classes: int = 6):
        super().__init__()
        self.num_classes = num_classes

    def forward(self, **kwargs) -> torch.Tensor:
        return torch.randn(1, self.num_classes)


class _ModelCache:
    instance: nn.Module | None = None
    device: torch.device | None = None
    demo: bool = False

_cache = _ModelCache()


def load_model() -> tuple[nn.Module, torch.device]:
    if _cache.instance is not None:
        assert _cache.device is not None
        return _cache.instance, _cache.device

    device = torch.device(DEVICE)

    if not MODEL_PATH.exists():
        if DEMO_MODE:
            model = DemoModel(num_classes=6)
            model.to(device)
            model.eval()
            _cache.instance = model
            _cache.device = device
            _cache.demo = True
            return model, device
        raise FileNotFoundError(
            f"Model checkpoint not found at {MODEL_PATH}. "
            "Place your trained best_model.pth in the models/ directory "
            "or set EMOTISENSE_DEMO=true for demo mode."
        )

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


def get_model() -> tuple[nn.Module, torch.device]:
    if _cache.instance is None:
        return load_model()
    assert _cache.device is not None
    return _cache.instance, _cache.device


def unload_model() -> None:
    _cache.instance = None
    _cache.device = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
