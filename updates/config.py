"""
Minimal config.py for the Colab training environment.

This intentionally strips out everything from your real backend/config.py
that isn't needed for training and could break depending on where the file
sits in Colab's filesystem: the UPLOAD_DIR.mkdir() side effect, Supabase
settings, upload constraints. model_loader.py only needs MODEL_PATH, DEVICE,
DEMO_MODE, and EMOTION_LABELS to exist at import time — this provides
exactly those, safely.

Do NOT use this file in your actual backend deployment — that should keep
using your real config.py with the Supabase/upload logic intact. This is
training-only.

--- NEW in this version ---
E2E_FINETUNING is the switch that tells model_loader.py / inference.py
which model architecture + checkpoint format to use:
  - False -> old head-only model (frozen BERT/HuBERT, precomputed
    embeddings). This is the checkpoint that produced the validated
    0.5822 macro-F1 result. Nothing about that path changes.
  - True  -> new end-to-end model (model_e2e.py), where the last few
    encoder layers of BERT/HuBERT are fine-tuned jointly with the fusion
    head. This needs its own, differently-shaped checkpoint — hence the
    separate MODEL_PATH_E2E rather than overwriting MODEL_PATH.

Flip E2E_FINETUNING to True only once you actually have an e2e checkpoint
saved at MODEL_PATH_E2E from train_emotisense_e2e.py. Flipping it before
that file exists will raise FileNotFoundError (or fall into demo mode if
DEMO_MODE is True) rather than silently loading the wrong thing.
"""

from pathlib import Path

DEVICE = "cuda"
DEMO_MODE = False

EMOTION_LABELS = ["angry", "happy", "sad", "neutral", "frustrated"]  # exc merged into happy

# --- head-only (frozen-encoder) checkpoint — unchanged from before ---
MODEL_PATH = Path("/content/mindlens_best.pth")   # unused during training itself,
                                                    # only needs to exist as a name

# --- end-to-end (partially fine-tuned) checkpoint — new ---
E2E_FINETUNING = False  # flip to True once MODEL_PATH_E2E actually exists
MODEL_PATH_E2E = Path("/content/mindlens_e2e_best.pth")

# How many of the last transformer layers to unfreeze in each encoder.
# bert-base-uncased and hubert-base-ls960 both have 12 layers, so these are
# small relative to the total depth on purpose — unfreezing more raises the
# risk of catastrophic forgetting on a dataset as small as IEMOCAP.
NUM_UNFROZEN_TEXT_LAYERS = 3
NUM_UNFROZEN_AUDIO_LAYERS = 3
