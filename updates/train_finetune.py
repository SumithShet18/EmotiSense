"""
Partial fine-tuning training script — unfreezes the last few BERT/HuBERT
layers and trains them jointly with the fusion head, instead of using fully
frozen embeddings.

This is a heavier run than the head-only version: expect roughly 15-40
minutes on a T4 depending on epochs/batch size (vs ~5-10 min for head-only
training). Preprocessing (audio decode/resample/trim, tokenization) is
cached to disk once, since that part doesn't change between epochs — only
the encoder forward/backward passes repeat each epoch.

Usage:
    python train_finetune.py --dataset_root /path/to/IEMOCAP_full_release \
        --model_loader_path . --preprocess_cache_dir ./raw_cache \
        --output mindlens_finetuned.pth
"""

import argparse
import os
import re
import random
from collections import Counter

import numpy as np
import torch
import torch.nn as nn
import torchaudio
import torchaudio.transforms as T
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import f1_score, accuracy_score, confusion_matrix, classification_report

random.seed(42)
np.random.seed(42)
torch.manual_seed(42)

RAW_EMOTION_CODES = {"ang", "hap", "sad", "neu", "exc", "fru"}
MERGE_MAP = {"ang": "ang", "hap": "hap", "sad": "sad", "neu": "neu", "exc": "hap", "fru": "fru"}
EMOTION_LABELS = ["ang", "hap", "sad", "neu", "fru"]
LABEL_TO_IDX = {label: i for i, label in enumerate(EMOTION_LABELS)}

TARGET_SAMPLE_RATE = 16000
MAX_AUDIO_LENGTH = 16000 * 6   # fixed length: shorter clips are zero-padded,
                                # attention_mask marks real vs padded samples
MAX_TEXT_LENGTH = 128


# ─────────────────────────────────────────────────────────────────────────
# Dataset parsing (same as train_emotisense_head.py)
# ─────────────────────────────────────────────────────────────────────────

def parse_label_file(label_path):
    labels = {}
    with open(label_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            match = re.match(r"\[[\d\. ]+ - [\d\. ]+\]\s+(\S+)\s+(\w+)", line)
            if match:
                labels[match.group(1)] = match.group(2).lower()
    return labels


def parse_transcription_file(trans_path):
    transcriptions = {}
    with open(trans_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            match = re.match(r"(\S+)\s+\[[\d\.]+-[\d\.]+\]:\s+(.*)", line)
            if match:
                transcriptions[match.group(1)] = match.group(2).strip()
    return transcriptions


def resolve_dataset_root(root):
    if not os.path.isdir(root):
        raise FileNotFoundError(f"Dataset root does not exist: {root}")

    def has_sessions(path):
        try:
            return any(d.startswith("Session") and os.path.isdir(os.path.join(path, d))
                       for d in os.listdir(path))
        except (OSError, PermissionError):
            return False

    if has_sessions(root):
        return root
    for d in os.listdir(root):
        sub = os.path.join(root, d)
        if os.path.isdir(sub) and has_sessions(sub):
            print(f"Note: Session folders found one level deeper. Using: {sub}")
            return sub
    raise FileNotFoundError(f"Could not find Session1-5 under {root} or its subdirectories.")


def build_dataset(dataset_root):
    samples = []
    for session in sorted(os.listdir(dataset_root)):
        session_path = os.path.join(dataset_root, session)
        if not os.path.isdir(session_path) or not session.startswith("Session"):
            continue
        session_num = int(re.search(r"\d+", session).group())

        dialog_root = os.path.join(session_path, "dialog")
        wav_root = os.path.join(session_path, "sentences", "wav")
        emo_eval = os.path.join(dialog_root, "EmoEvaluation")
        trans_root = os.path.join(dialog_root, "transcriptions")
        if not all(os.path.isdir(d) for d in [emo_eval, trans_root, wav_root]):
            continue

        for label_file in sorted(os.listdir(emo_eval)):
            if not label_file.endswith(".txt"):
                continue
            dialog_id = label_file.replace(".txt", "")
            label_path = os.path.join(emo_eval, label_file)
            trans_path = os.path.join(trans_root, dialog_id + ".txt")
            wav_dir = os.path.join(wav_root, dialog_id)
            if not os.path.isfile(trans_path) or not os.path.isdir(wav_dir):
                continue

            labels = parse_label_file(label_path)
            transcriptions = parse_transcription_file(trans_path)
            for utt_id, emotion in labels.items():
                if emotion not in RAW_EMOTION_CODES:
                    continue
                text = transcriptions.get(utt_id)
                if not text:
                    continue
                audio_path = os.path.join(wav_dir, utt_id + ".wav")
                if not os.path.isfile(audio_path):
                    continue
                samples.append({
                    "utt_id": utt_id, "audio_path": audio_path, "text": text,
                    "label": LABEL_TO_IDX[MERGE_MAP[emotion]], "session": session_num,
                })
    return samples


def trim_silence(waveform: torch.Tensor, top_db: float = 30.0, frame_length: int = 1024, hop_length: int = 256):
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


# ─────────────────────────────────────────────────────────────────────────
# Preprocessing cache: fixed-length tokenized text + fixed-length padded
# waveforms, computed once. This is what makes repeated epochs fast — the
# expensive part (disk I/O, resampling, trimming, tokenizing) only happens
# once, not on every epoch.
# ─────────────────────────────────────────────────────────────────────────

def preprocess_and_cache(samples, text_model_name, cache_path):
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(text_model_name)

    try:
        from tqdm import tqdm
        iterator = tqdm(samples, desc="Preprocessing")
    except ImportError:
        iterator = samples
        print("(tip: pip install tqdm for a progress bar)")

    n = len(samples)
    # Preallocated in place (not appended-to-list-then-stacked) to avoid
    # holding two full copies in RAM at once. audio_mask stored as int8
    # (1 byte/element) instead of int64 (8 bytes/element) — for a 96000-
    # length mask across 7380 samples that alone is a ~5GB difference,
    # which is what was pushing this past Colab's RAM limit and getting
    # the process silently OOM-killed. Cast back to long per-sample in
    # RawDataset.__getitem__, where it's cheap.
    input_ids = torch.zeros(n, MAX_TEXT_LENGTH, dtype=torch.long)
    text_mask = torch.zeros(n, MAX_TEXT_LENGTH, dtype=torch.long)
    waveforms = torch.zeros(n, MAX_AUDIO_LENGTH, dtype=torch.float32)
    audio_mask = torch.zeros(n, MAX_AUDIO_LENGTH, dtype=torch.int8)
    labels = torch.zeros(n, dtype=torch.long)
    sessions = torch.zeros(n, dtype=torch.long)

    for i, s in enumerate(iterator):
        enc = tokenizer(s["text"], max_length=MAX_TEXT_LENGTH, truncation=True,
                         padding="max_length", return_tensors="pt")
        input_ids[i] = enc["input_ids"].squeeze(0)
        text_mask[i] = enc["attention_mask"].squeeze(0)

        wav, sr = torchaudio.load(s["audio_path"])
        if wav.shape[0] > 1:
            wav = wav.mean(dim=0, keepdim=True)
        if sr != TARGET_SAMPLE_RATE:
            wav = T.Resample(sr, TARGET_SAMPLE_RATE)(wav)
        wav = wav.squeeze(0)
        wav = trim_silence(wav)
        wav = wav[:MAX_AUDIO_LENGTH]

        # CRITICAL: HuBERT (facebook/hubert-base-ls960) was pretrained on
        # zero-mean, unit-variance normalized audio (this is what
        # Wav2Vec2FeatureExtractor normally does automatically). Since we're
        # feeding raw waveforms directly now instead of going through that
        # feature extractor, normalization has to be applied explicitly here
        # — skipping it would silently feed the model out-of-distribution
        # input and hurt performance without throwing any error.
        wav = (wav - wav.mean()) / torch.sqrt(wav.var() + 1e-7)

        real_len = wav.shape[0]
        waveforms[i, :real_len] = wav
        audio_mask[i, :real_len] = 1
        labels[i] = s["label"]
        sessions[i] = s["session"]

    return {
        "input_ids": input_ids,
        "text_mask": text_mask,
        "waveforms": waveforms,
        "audio_mask": audio_mask,
        "labels": labels,
        "sessions": sessions,
    }


class RawDataset(Dataset):
    def __init__(self, data, mask):
        self.input_ids = data["input_ids"][mask]
        self.text_mask = data["text_mask"][mask]
        self.waveforms = data["waveforms"][mask]
        self.audio_mask = data["audio_mask"][mask]  # int8 on disk
        self.labels = data["labels"][mask]

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return (self.input_ids[idx], self.text_mask[idx],
                self.waveforms[idx], self.audio_mask[idx].long(), self.labels[idx])


# ─────────────────────────────────────────────────────────────────────────
# Train / eval
# ─────────────────────────────────────────────────────────────────────────

def run_epoch(model, loader, criterion, optimizer, device, training, scaler=None):
    model.train() if training else model.eval()
    total_loss = 0.0
    all_preds, all_labels = [], []

    with torch.set_grad_enabled(training):
        for input_ids, text_mask, waveforms, audio_mask, labels in loader:
            input_ids, text_mask = input_ids.to(device), text_mask.to(device)
            waveforms, audio_mask = waveforms.to(device), audio_mask.to(device)
            labels = labels.to(device)

            if training:
                optimizer.zero_grad()

            use_amp = scaler is not None and device.type == "cuda"
            with torch.cuda.amp.autocast(enabled=use_amp):
                logits = model(input_ids=input_ids, attention_mask_text=text_mask,
                                input_values=waveforms, attention_mask_audio=audio_mask)
                loss = criterion(logits, labels)

            if training:
                if use_amp:
                    scaler.scale(loss).backward()
                    scaler.unscale_(optimizer)
                    torch.nn.utils.clip_grad_norm_(
                        (p for p in model.parameters() if p.requires_grad), max_norm=1.0)
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(
                        (p for p in model.parameters() if p.requires_grad), max_norm=1.0)
                    optimizer.step()

            total_loss += loss.item() * labels.size(0)
            all_preds.extend(logits.argmax(dim=1).cpu().tolist())
            all_labels.extend(labels.cpu().tolist())

    avg_loss = total_loss / len(all_labels)
    acc = accuracy_score(all_labels, all_preds)
    macro_f1 = f1_score(all_labels, all_preds, average="macro", zero_division=0)
    return avg_loss, acc, macro_f1, all_preds, all_labels


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset_root", required=True)
    parser.add_argument("--model_loader_path", default=".")
    parser.add_argument("--preprocess_cache_dir", default="./raw_cache")
    parser.add_argument("--output", default="mindlens_finetuned.pth")
    parser.add_argument("--text_model", default="bert-base-uncased")
    parser.add_argument("--audio_model", default="facebook/hubert-base-ls960")
    parser.add_argument("--num_unfrozen_text_layers", type=int, default=3)
    parser.add_argument("--num_unfrozen_audio_layers", type=int, default=3)
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--encoder_lr", type=float, default=2e-5)
    parser.add_argument("--head_lr", type=float, default=1e-3)
    parser.add_argument("--val_session", type=int, default=4)
    parser.add_argument("--test_session", type=int, default=5)
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    args = parser.parse_args()

    if args.device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)
    if device.type == "cpu":
        torch.set_num_threads(os.cpu_count() or 4)
        print("WARNING: fine-tuning on CPU will be very slow (hours). Strongly recommend a GPU runtime.")
    print(f"Device: {device}")

    os.makedirs(args.preprocess_cache_dir, exist_ok=True)
    cache_path = os.path.join(args.preprocess_cache_dir, "raw_preprocessed.pt")

    args.dataset_root = resolve_dataset_root(args.dataset_root)
    samples = build_dataset(args.dataset_root)
    if len(samples) == 0:
        raise RuntimeError("Found 0 samples — check --dataset_root.")
    print(f"Total samples: {len(samples)}")
    print("Label distribution:", {EMOTION_LABELS[k]: v for k, v in Counter(s["label"] for s in samples).items()})

    if os.path.exists(cache_path):
        print(f"Loading cached preprocessed data from {cache_path}")
        data = torch.load(cache_path)
    else:
        data = preprocess_and_cache(samples, args.text_model, cache_path)
        torch.save(data, cache_path)
        print(f"Cached preprocessed data to {cache_path}")

    sessions = data["sessions"]
    train_mask = (sessions != args.val_session) & (sessions != args.test_session)
    val_mask = sessions == args.val_session
    test_mask = sessions == args.test_session

    train_ds = RawDataset(data, train_mask)
    val_ds = RawDataset(data, val_mask)
    test_ds = RawDataset(data, test_mask)
    print(f"Train: {len(train_ds)} | Val: {len(val_ds)} | Test: {len(test_ds)}")

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, num_workers=2)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, num_workers=2)

    train_labels = data["labels"][train_mask]
    class_counts = np.bincount(train_labels.numpy(), minlength=len(EMOTION_LABELS))
    class_weights = torch.tensor(
        len(train_labels) / (len(EMOTION_LABELS) * np.maximum(class_counts, 1)), dtype=torch.float32
    ).to(device)
    print("Class weights:", dict(zip(EMOTION_LABELS, class_weights.cpu().tolist())))

    from full_model import build_full_model
    model = build_full_model(
        args.model_loader_path, args.text_model, args.audio_model,
        args.num_unfrozen_text_layers, args.num_unfrozen_audio_layers,
        num_classes=len(EMOTION_LABELS),
    ).to(device)

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"Trainable params: {trainable:,} / {total:,} ({100*trainable/total:.1f}%)")

    # Differential learning rates: small for fine-tuned encoder layers
    # (they already have good pretrained representations, don't want to
    # wreck them with a large step), higher for the fusion head (freshly
    # initialized, needs to learn faster).
    encoder_params = [p for n, p in model.named_parameters()
                       if p.requires_grad and ("text_encoder" in n or "audio_encoder" in n)]
    head_params = [p for n, p in model.named_parameters()
                    if p.requires_grad and "encoder" not in n.split(".")[0]]
    optimizer = torch.optim.AdamW([
        {"params": encoder_params, "lr": args.encoder_lr, "weight_decay": 0.01},
        {"params": head_params, "lr": args.head_lr, "weight_decay": 1e-4},
    ])
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=3)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    scaler = torch.cuda.amp.GradScaler() if device.type == "cuda" else None

    best_val_f1, patience, patience_counter = 0.0, 6, 0

    for epoch in range(args.epochs):
        train_loss, train_acc, train_f1, _, _ = run_epoch(model, train_loader, criterion, optimizer, device, True, scaler)
        val_loss, val_acc, val_f1, _, _ = run_epoch(model, val_loader, criterion, optimizer, device, False, scaler)
        scheduler.step(val_f1)

        print(f"Epoch [{epoch+1:02d}/{args.epochs}] "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc*100:.2f}% F1: {train_f1:.4f} | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc*100:.2f}% F1: {val_f1:.4f}")

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            patience_counter = 0
            torch.save(model.state_dict(), args.output)
            print(f"  ✓ Best model saved (Val macro-F1: {val_f1:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"Early stopping at epoch {epoch+1}")
                break

    print("\n" + "=" * 60)
    print("FINAL EVALUATION ON HELD-OUT TEST SESSION")
    print("=" * 60)
    model.load_state_dict(torch.load(args.output, map_location=device))
    _, test_acc, test_f1, test_preds, test_labels = run_epoch(model, test_loader, criterion, optimizer, device, False, scaler)
    print(f"Test Accuracy: {test_acc*100:.2f}%")
    print(f"Test Macro-F1: {test_f1:.4f}")
    print(classification_report(test_labels, test_preds, target_names=EMOTION_LABELS, zero_division=0))
    print("Confusion matrix (rows=true, cols=predicted):", EMOTION_LABELS)
    print(confusion_matrix(test_labels, test_preds))


if __name__ == "__main__":
    main()
