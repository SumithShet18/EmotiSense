"""
Automatic speech transcription using faster-whisper.
"""

from config import DEMO_MODE

try:
    from faster_whisper import WhisperModel
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False

_whisper_model: "WhisperModel | None" = None
WHISPER_MODEL_SIZE = "large-v3"


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        if not HAS_WHISPER:
            raise RuntimeError("faster-whisper is not installed.")
        _whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device="cpu",
            compute_type="int8",
        )
    return _whisper_model


def transcribe_audio(audio_path: str) -> str:
    if DEMO_MODE:
        return "(demo transcription)"
    model = _get_whisper_model()
    segments, info = model.transcribe(
        audio_path,
        language="en",
        beam_size=5,
        vad_filter=True,
        condition_on_previous_text=False,
    )
    transcript_parts = []
    for segment in segments:
        transcript_parts.append(segment.text)
    return " ".join(transcript_parts).strip()
