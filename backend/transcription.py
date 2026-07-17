"""
Automatic speech transcription using faster-whisper.
"""

try:
    from faster_whisper import WhisperModel
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False

_whisper_model: "WhisperModel | None" = None
WHISPER_MODEL_SIZE = "base"


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
    import io, os, tempfile
    import librosa, soundfile as sf
    tmp_path = None
    try:
        model = _get_whisper_model()
        waveform, _ = librosa.load(audio_path, sr=16000, mono=True)
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp_path = tmp.name
        tmp.close()
        sf.write(tmp_path, waveform, 16000)
        segments, _ = model.transcribe(
            tmp_path,
            language="en",
            beam_size=3,
            vad_filter=True,
            condition_on_previous_text=False,
        )
        result = " ".join(s.text for s in segments).strip()
        return result if result else "(no speech detected)"
    except Exception as e:
        raise RuntimeError(f"Whisper transcription failed: {e}")
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
