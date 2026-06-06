# EmotiSense

**Multimodal AI Emotion Detection System** — analyzes text and speech to detect human emotions using MentalBERT, HuBERT, and Cross-Modal Attention Fusion.

![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Tailwind-61DAFB)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%20%7C%20PyTorch-009688)
![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E)
![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%7C%20Render-000000)

---

## Architecture

```
User → Frontend (Vercel) → Backend API (Render) → Model Inference → Supabase (DB + Storage)
```

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | React + TypeScript + Tailwind + Vite | Vercel |
| Backend | FastAPI + Python + Uvicorn | Render |
| Database | PostgreSQL | Supabase |
| Storage | S3-compatible object storage | Supabase Storage |
| Model | MentalBERT + HuBERT + Cross-Modal Attention | PyTorch |

## Emotion Classes

| Emotion | Description |
|---------|-------------|
| 😡 Angry | Frustration, irritation, hostility |
| 😊 Happy | Joy, satisfaction, positivity |
| 😢 Sad | Melancholy, disappointment, low mood |
| 😐 Neutral | Calm, balanced, emotionally flat |
| 🤩 Excited | Anticipation, enthusiasm, heightened positive affect |
| 😤 Frustrated | Annoyance, irritation, blocked goals |

## Features

- **Multimodal Input** — Analyze text, audio, or both simultaneously
- **Speech-to-Text** — Automatic transcription via OpenAI Whisper (large-v3)
- **Text Understanding** — MentalBERT extracts semantic features
- **Audio Understanding** — HuBERT extracts acoustic features
- **Cross-Modal Fusion** — Multi-head attention fuses text + audio features
- **6 Emotion Classes** — Angry, Happy, Sad, Neutral, Excited, Frustrated
- **Cloud Persistence** — All predictions stored in Supabase PostgreSQL
- **Audio Storage** — Uploaded audio stored in Supabase Storage with playback
- **History Dashboard** — Search, filter, paginate past predictions
- **Dark Theme UI** — Glass morphism design with Tailwind CSS

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase account (free tier)

### 1. Clone & Backend Setup

```bash
git clone https://github.com/SumithShet18/EmotiSense.git
cd EmotiSense/backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment Variables

Create `backend/.env` or set in your environment:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
USE_SUPABASE=true
EMOTISENSE_DEMO=false
EMOTISENSE_DEVICE=cpu
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Database Setup

Run the migration script in your Supabase SQL Editor:

```
scripts/migration.sql
```

This creates the `emotion_logs` table and `audio-files` storage bucket.

### 4. Run Backend

```bash
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## API Endpoints

| Method | Path | Description | Parameters |
|--------|------|-------------|------------|
| `GET` | `/health` | Health check | — |
| `POST` | `/predict` | Emotion prediction | `text` (form, optional), `audio` (file, optional) |
| `GET` | `/history` | Prediction history | `limit`, `offset`, `search`, `emotion` (query) |
| `GET` | `/prediction/{id}` | Single prediction detail | `id` (path, UUID or int) |

### POST /predict

Accepts `multipart/form-data`:

- `text` (optional, max 5000 chars) — Input text for analysis
- `audio` (optional, .wav/.mp3/.m4a, max 10 MB) — Audio file for analysis

Returns:

```json
{
  "id": "uuid-string",
  "transcript": "I am feeling great today",
  "emotion": "happy",
  "confidence": 0.94,
  "probabilities": {
    "angry": 0.01,
    "happy": 0.94,
    "sad": 0.01,
    "neutral": 0.02,
    "excited": 0.01,
    "frustrated": 0.01
  }
}
```

## Database Schema

```sql
CREATE TABLE emotion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transcript TEXT,
    emotion TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    probabilities JSONB,
    audio_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Deployment

### Frontend (Vercel)

```bash
cd frontend
npx vercel --prod
```

Set environment variable in Vercel dashboard:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://emotisense-backend.onrender.com` |

### Backend (Render)

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:

| Field | Value |
|-------|-------|
| Name | `emotisense-backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `cd backend && uvicorn app:app --host 0.0.0.0 --port $PORT` |

5. Add environment variables in Render dashboard:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `your-service-role-key` |
| `SUPABASE_ANON_KEY` | `your-anon-key` |
| `USE_SUPABASE` | `true` |
| `EMOTISENSE_DEMO` | `false` |
| `CORS_ORIGINS` | `https://frontend-rose-nine-21.vercel.app` |

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS 3, Vite 6, Framer Motion, React Router 6
- **Backend:** FastAPI, Python 3.11, Uvicorn, PyTorch
- **ML Models:** MentalBERT, HuBERT, Cross-Attention Fusion, Whisper large-v3
- **Cloud:** Supabase PostgreSQL, Supabase Storage, Vercel, Render
- **DevOps:** Git, GitHub, CI/CD pipelines

## License

MIT License — see [LICENSE](LICENSE)

---

*EmotiSense — Project Report • June 2026*
