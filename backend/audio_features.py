import numpy as np
import logging

logger = logging.getLogger("emotisense")


def analyze_audio_features(audio_path: str) -> dict | None:
    import librosa

    try:
        waveform, sr = librosa.load(audio_path, sr=16000)
    except Exception as e:
        logger.warning(f"Audio analysis failed: {e}")
        return None

    rms = librosa.feature.rms(y=waveform)[0]
    energy_mean = float(np.mean(rms))
    energy_var = float(np.var(rms))

    f0, voiced, _ = librosa.pyin(waveform, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'), sr=sr)
    f0_voiced = f0[voiced]
    mean_pitch = float(np.mean(f0_voiced)) if len(f0_voiced) > 0 else 0.0
    pitch_var = float(np.var(f0_voiced)) if len(f0_voiced) > 0 else 0.0

    spectral_centroids = librosa.feature.spectral_centroid(y=waveform, sr=sr)[0]
    mean_spectral = float(np.mean(spectral_centroids))

    spectral_bandwidth = librosa.feature.spectral_bandwidth(y=waveform, sr=sr)[0]
    mean_bandwidth = float(np.mean(spectral_bandwidth))

    onset_frames = librosa.onset.onset_detect(y=waveform, sr=sr, units="time")
    speech_rate = len(onset_frames) / (len(waveform) / sr) if len(waveform) > 0 else 0.0

    silence_threshold = 0.01
    silent_regions = np.sum(rms < silence_threshold) / len(rms) if len(rms) > 0 else 0.0

    return {
        "energy": {
            "mean": round(energy_mean, 4),
            "variance": round(energy_var, 4),
            "level": "high" if energy_mean > 0.08 else ("low" if energy_mean < 0.02 else "moderate"),
        },
        "pitch": {
            "mean_hz": round(mean_pitch, 2),
            "variance": round(pitch_var, 2),
            "variation": "high" if pitch_var > 200 else ("low" if pitch_var < 50 else "moderate"),
        },
        "speech_rate": {
            "syllables_per_sec": round(speech_rate, 2),
            "pace": "fast" if speech_rate > 4.0 else ("slow" if speech_rate < 2.0 else "moderate"),
        },
        "pauses": {
            "silence_ratio": round(silent_regions, 4),
            "frequency": "frequent" if silent_regions > 0.3 else ("rare" if silent_regions < 0.1 else "occasional"),
        },
        "spectral": {
            "centroid_mean": round(mean_spectral, 2),
            "bandwidth_mean": round(mean_bandwidth, 2),
            "timbre": "bright" if mean_spectral > 3000 else ("dark" if mean_spectral < 1000 else "neutral"),
        },
    }
