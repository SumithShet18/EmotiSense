# EmotiSense

Multimodal Emotion Detection System — text + audio → emotion prediction.

Uses **MentalBERT**, **HuBERT**, and **Cross-Modal Attention** to classify emotions: Angry, Happy, Sad, Neutral, Excited, Frustrated.

---

## Project Structure

```
emotisense/
├── backend/
│   ├── app.py              # FastAPI application & API routes
│   ├── inference.py        # Prediction pipeline (TODO: add preprocessing)
│   ├── model_loader.py     # Model loading (TODO: add model class)
│   ├── schemas.py          # Pydantic request/response models
│   ├── database.py         # SQLite operations
│   ├── config.py           # Paths, constants, device config
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── api/client.ts   # HTTP client for backend API
│   │   ├── components/     # Navbar, Layout, ResultCard
│   │   ├── pages/          # Home, Analyze, History, About
│   │   ├── types/          # TypeScript interfaces
│   │   └── App.tsx         # Router setup
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── database/               # SQLite DB + uploaded audio
├── models/                 # Place your best_model.pth here
└── README.md
```

---

## Setup

### 1. Backend

```bash
cd emotisense/backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Frontend

```bash
cd emotisense/frontend
npm install
```

### 3. Model

Place your trained model checkpoint at:

```
emotisense/models/best_model.pth
```

---

## Integration: Connect Your Model

Three files require your model-specific code (marked with `TODO` comments):

### `backend/model_loader.py`

1. **Replace the placeholder `EmotiSenseModel` class** with your actual model architecture.
2. **Adjust state_dict loading** in `load_model()` to match your checkpoint format.

### `backend/inference.py`

1. **Implement `preprocess_text()`** — tokenization for MentalBERT / your text encoder.
2. **Implement `preprocess_audio()`** — audio loading and feature extraction for HuBERT / your audio encoder.
3. **Adjust `run_model()`** — call your model's forward method with the correct arguments.

### `backend/requirements.txt`

Uncomment/add any additional dependencies your model needs (e.g., `transformers`, `librosa`, `soundfile`).

---

## Run

### Backend (terminal 1)

```bash
cd emotisense/backend
venv\Scripts\activate    # or source venv/bin/activate
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (terminal 2)

```bash
cd emotisense/frontend
npm run dev
```

Open http://localhost:5173

---

## API Endpoints

| Method | Path              | Description                |
|--------|-------------------|----------------------------|
| GET    | `/health`         | Health check               |
| POST   | `/predict`        | Submit text/audio for prediction |
| GET    | `/history`        | List all predictions       |
| GET    | `/prediction/{id}` | Get single prediction      |

### POST /predict

Accepts `multipart/form-data` with fields:
- `text` (optional) — input text string
- `audio` (optional) — audio file (WAV, MP3, M4A, max 10 MB)

Returns:
```json
{
  "id": 1,
  "emotion": "happy",
  "confidence": 0.94,
  "probabilities": { "angry": 0.01, "happy": 0.94, "sad": 0.01, "neutral": 0.02, "excited": 0.01, "frustrated": 0.01 }
}
```

---

## Environment Variables

| Variable               | Default  | Description                     |
|------------------------|----------|---------------------------------|
| `VITE_API_URL`         | `http://localhost:8000` | Backend URL (frontend) |
| `EMOTISENSE_DEVICE`    | `cpu`    | PyTorch device (`cpu` or `cuda`) |

---

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** FastAPI, Python, PyTorch
- **Database:** SQLite
