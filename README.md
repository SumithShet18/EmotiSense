# EmotiSense

**Multimodal AI Emotion Detection System** — analyzes speech audio to detect human emotions using MentalBERT (text from Whisper transcription), HuBERT (raw audio), and Cross-Modal Attention Fusion.

![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Tailwind-61DAFB)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%20%7C%20PyTorch-009688)
![Model](https://img.shields.io/badge/Model-MentalBERT%20%7C%20HuBERT%20%7C%20Fusion-FF6F00)

---

## Architecture

```
Audio Input ──┬──→ Whisper Transcription → MentalBERT (fine-tuned) ──┐
              │                                                      │
              └──→ VAD + Normalization → HuBERT (fine-tuned) ─────┤
                                                                    │
                        Cross-Modal Attention + Gated Residual Fusion
                                                                    │
                                                    5-Class Classifier
                                                                    │
                                              angry / happy / sad / neutral / frustrated
```

- **Single entry point**: Audio recording only (no separate text input)
- **Whisper (base)** transcribes speech → text
- **MentalBERT** (fine-tuned `bert-base-uncased`, last 3 layers) encodes transcription
- **HuBERT** (fine-tuned `hubert-base-ls960`, last 3 layers) encodes raw audio
- **Cross-attention fusion** with learned gated residual combines both
- **5 emotion classes**: angry, happy, sad, neutral, frustrated (excited → happy per IEMOCAP protocol)

### Test Performance (IEMOCAP held-out)

| Metric | Value |
|--------|-------|
| Accuracy | 65.17% |
| Macro F1 | 64.90% |

| Class | Precision | Recall | F1 |
|-------|-----------|--------|----|
| Angry | 0.59 | 0.63 | 0.61 |
| Happy | 0.87 | 0.63 | 0.73 |
| Sad | 0.69 | 0.67 | 0.68 |
| Neutral | 0.56 | 0.76 | 0.64 |
| Frustrated | 0.60 | 0.57 | 0.59 |

## Features

- **Audio-only input** — record or upload; Whisper transcribes automatically
- **Explainable AI** — token attention, modality contribution (gate %), Integrated Gradients
- **Modality contribution** — per-prediction learned gate split (e.g., 65% text / 35% audio)
- **Performance profiling** — per-stage latency, CPU, memory, energy estimation
- **Interactive pipeline walkthrough** — Architecture page with dual-track visualization
- **Printable PDF report** — 7-section report with cover page, ToC, page numbers
- **History dashboard** — search, filter, paginate past predictions with charts
- **Dual database** — SQLite local or Supabase cloud

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1. Clone

```bash
git clone https://github.com/SumithShet18/EmotiSense.git
cd EmotiSense
```

### 2. Download Model Checkpoint

The trained model (~830MB) is not stored in git. Download it from the [releases page](https://github.com/SumithShet18/EmotiSense/releases) and place at:

```
models/finetuned-final/mindlens_finetuned.pth
```

Alternatively, set `EMOTISENSE_DEMO=true` to run with random predictions (no model needed).

### 3. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
EMOTISENSE_DEMO=false
EMOTISENSE_DEVICE=cpu
USE_SUPABASE=false
CORS_ORIGINS=http://localhost:5173
```

### 4. Run Backend

```bash
cd backend
uvicorn app:app --host 0.0.0.0 --port 8742
```

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/predict` | Emotion prediction (FormData: `audio` or `text`) |
| `GET` | `/last-result` | Latest prediction from memory |
| `POST` | `/explain` | Full XAI with Integrated Gradients |
| `GET` | `/history` | Paginated history with search/filter |
| `GET` | `/prediction/{id}` | Single prediction detail |
| `GET` | `/performance` | Performance logs |

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS 3, Vite 6, Framer Motion, React Router 6, Recharts
- **Backend:** FastAPI, Python 3.11+, Uvicorn, PyTorch
- **ML Models:** MentalBERT (bert-base-uncased), HuBERT (hubert-base-ls960), Cross-Attention Fusion, faster-whisper (base)
- **Training:** IEMOCAP dataset, 7,380 utterances, partial fine-tuning (last 3 layers)
- **Database:** SQLite (local) or Supabase PostgreSQL
- **Audio:** librosa, torchaudio, soundfile

## License

MIT License — see [LICENSE](LICENSE)
