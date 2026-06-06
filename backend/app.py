import uuid
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import UPLOAD_DIR, ALLOWED_AUDIO_EXTENSIONS, MAX_AUDIO_SIZE_MB
from database import init_db, insert_prediction, get_all_predictions, get_prediction_by_id, get_total_count
from schemas import HealthResponse, PredictResponse, HistoryItem, HistoryResponse
from inference import predict_emotion


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="EmotiSense API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse()


@app.post("/predict", response_model=PredictResponse)
async def predict(
    text: str = Form(default=""),
    audio: UploadFile = File(default=None),
):
    text_input = text.strip() if text else ""
    audio_path = None

    if not text_input and not audio:
        raise HTTPException(
            status_code=400,
            detail="Provide audio (or text) for emotion analysis.",
        )

    if audio:
        if audio.filename:
            ext = Path(audio.filename).suffix.lower()
        else:
            ext = ".wav"

        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported audio format '{ext}'. Allowed: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}",
            )

        content = await audio.read()
        if len(content) > MAX_AUDIO_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"Audio file exceeds {MAX_AUDIO_SIZE_MB} MB limit.",
            )

        file_id = uuid.uuid4().hex
        safe_name = f"{file_id}{ext}"
        save_path = UPLOAD_DIR / safe_name
        with open(save_path, "wb") as f:
            f.write(content)
        audio_path = str(save_path)

    try:
        emotion, confidence, probabilities, transcript = predict_emotion(
            text=text_input or None,
            audio_path=audio_path,
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {str(e)}",
        )
    finally:
        if audio_path:
            Path(audio_path).unlink(missing_ok=True)

    pred_id = insert_prediction(
        text_input=transcript or text_input or None,
        audio_path=audio_path,
        emotion=emotion,
        confidence=confidence,
        probabilities=probabilities,
    )

    return PredictResponse(
        id=pred_id,
        transcript=transcript,
        emotion=emotion,
        confidence=confidence,
        probabilities=probabilities,
    )


@app.get("/history", response_model=HistoryResponse)
async def history(limit: int = 100, offset: int = 0):
    items = get_all_predictions(limit=limit, offset=offset)
    total = get_total_count()
    return HistoryResponse(items=[HistoryItem(**i) for i in items], total=total)


@app.get("/prediction/{prediction_id}", response_model=HistoryItem)
async def get_prediction(prediction_id: int):
    item = get_prediction_by_id(prediction_id)
    if not item:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    return HistoryItem(**item)
