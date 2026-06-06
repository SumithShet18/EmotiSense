import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_DIR = BASE_DIR / "models"
UPLOAD_DIR = BASE_DIR / "database" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "best_model.pth"

DEVICE = os.getenv("EMOTISENSE_DEVICE", "cpu")
DEMO_MODE = os.getenv("EMOTISENSE_DEMO", "true").lower() == "true"
USE_SUPABASE = os.getenv("USE_SUPABASE", "true").lower() == "true"

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "audio-files")
SUPABASE_CONFIGURED = bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)

EMOTION_LABELS = ["angry", "happy", "sad", "neutral", "excited", "frustrated"]

ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a"}
MAX_AUDIO_SIZE_MB = 10
SAMPLE_RATE = 16000
