TEXT_MODEL_NAME = "bert-base-uncased"
AUDIO_MODEL_NAME = "facebook/hubert-base-ls960"
TARGET_SAMPLE_RATE = 16000
MAX_AUDIO_LENGTH = 16000 * 6
MAX_TEXT_LENGTH = 128


def trim_silence(waveform, top_db: float = 30.0, frame_length: int = 1024, hop_length: int = 256):
    import torch

    n = waveform.shape[0]
    if n <= frame_length:
        return waveform
    frames = waveform.unfold(0, frame_length, hop_length)
    rms = frames.pow(2).mean(dim=-1).sqrt()
    rms_db = 20 * torch.log10(rms.clamp(min=1e-10))
    max_db = rms_db.max()
    mask = rms_db > (max_db - top_db)
    if not mask.any():
        return waveform
    idx = torch.nonzero(mask).squeeze(-1)
    start = idx[0].item() * hop_length
    end = min(idx[-1].item() * hop_length + frame_length, n)
    trimmed = waveform[start:end]
    return trimmed if trimmed.shape[0] > 0 else waveform


def load_and_preprocess_waveform(audio_path: str):
    import torchaudio
    import torchaudio.transforms as T

    waveform, sr = torchaudio.load(audio_path)
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
    if sr != TARGET_SAMPLE_RATE:
        waveform = T.Resample(sr, TARGET_SAMPLE_RATE)(waveform)
    waveform = waveform.squeeze(0)
    waveform = trim_silence(waveform)
    if waveform.shape[0] > MAX_AUDIO_LENGTH:
        waveform = waveform[:MAX_AUDIO_LENGTH]
    return waveform


def get_tokenizer():
    from transformers import AutoTokenizer
    return AutoTokenizer.from_pretrained(TEXT_MODEL_NAME)


def get_audio_processor():
    from transformers import Wav2Vec2FeatureExtractor
    return Wav2Vec2FeatureExtractor.from_pretrained(AUDIO_MODEL_NAME)
