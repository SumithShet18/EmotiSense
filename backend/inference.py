"""
Inference pipeline for EmotiSense.

When audio is uploaded without text, Whisper automatically transcribes it.
The transcript feeds MentalBERT, the original audio feeds HuBERT.
"""

from typing import Optional

import torch
import numpy as np

from config import EMOTION_LABELS, SAMPLE_RATE
from model_loader import get_model
from transcription import transcribe_audio

from transformers import AutoTokenizer, AutoModel
from transformers import Wav2Vec2FeatureExtractor, HubertModel
import librosa


TEXT_MODEL_NAME = "bert-base-uncased"
_text_tokenizer = None
_text_encoder = None


def _get_text_encoder():
    global _text_tokenizer, _text_encoder
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
    global _audio_processor, _audio_encoder
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


def run_model(
    model: torch.nn.Module,
    device: torch.device,
    text_input: Optional[torch.Tensor] = None,
    audio_input: Optional[torch.Tensor] = None,
) -> torch.Tensor:
    with torch.no_grad():
        if text_input is not None:
            text_input = text_input.to(device)
        if audio_input is not None:
            audio_input = audio_input.to(device)

        logits = model(text_features=text_input, audio_features=audio_input)

    return logits


def predict_emotion(
    text: Optional[str] = None,
    audio_path: Optional[str] = None,
) -> tuple[str, float, dict[str, float], Optional[str]]:
    """
    Predict emotion from text and/or audio.

    If audio_path is provided without text, Whisper transcribes it automatically.

    Returns:
        (emotion_label, confidence, probabilities_dict, transcript)
    """
    model, device = get_model()

    transcript: Optional[str] = None
    resolved_text = text

    if audio_path and not resolved_text:
        transcript = transcribe_audio(audio_path)
        resolved_text = transcript
    elif audio_path and resolved_text:
        transcript = resolved_text

    text_tensor: Optional[torch.Tensor] = None
    audio_tensor: Optional[torch.Tensor] = None

    if resolved_text:
        text_tensor = preprocess_text(resolved_text)

    if audio_path:
        audio_tensor = preprocess_audio(audio_path)

    if text_tensor is None and audio_tensor is None:
        raise ValueError("At least one of text or audio must be provided.")

    logits = run_model(model, device, text_input=text_tensor, audio_input=audio_tensor)

    probabilities = torch.softmax(logits, dim=-1)
    probs_np = probabilities.cpu().numpy().flatten()

    pred_idx = int(np.argmax(probs_np))
    confidence = float(probs_np[pred_idx])

    emotion_label = EMOTION_LABELS[pred_idx]
    prob_dict = {EMOTION_LABELS[i]: float(probs_np[i]) for i in range(len(EMOTION_LABELS))}

    return emotion_label, confidence, prob_dict, transcript
