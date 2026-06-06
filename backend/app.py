import uuid
import logging
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import ALLOWED_AUDIO_EXTENSIONS, MAX_AUDIO_SIZE_MB, SUPABASE_STORAGE_BUCKET
from database import init_db, insert_prediction, get_all_predictions, get_prediction_by_id, get_total_count, search_predictions, upload_audio
from schemas import HealthResponse, PredictResponse, HistoryItem, HistoryResponse
from inference import predict_emotion

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("emotisense")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "https://frontend-rose-nine-21.vercel.app,http://localhost:5173,http://localhost:3000").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting EmotiSense API")
    init_db()
    yield
    logger.info("Shutting down EmotiSense API")


app = FastAPI(title="EmotiSense API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse()


@app.post("/predict", response_model=PredictResponse)
async def predict(
    text: str = Form(default="", max_length=5000),
    audio: UploadFile = File(default=None),
):
    text_input = text.strip() if text else ""
    audio_url = None

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
        try:
            audio_url = upload_audio(SUPABASE_STORAGE_BUCKET, safe_name, content)
            logger.info(f"Uploaded audio {safe_name} to Supabase storage")
        except Exception as e:
            logger.error(f"Failed to upload audio to Supabase: {e}")
            raise HTTPException(status_code=502, detail="Failed to store audio file. Please try again.")

    try:
        emotion, confidence, probabilities, transcript = predict_emotion(
            text=text_input or None,
            audio_path=None,
        )
        logger.info(f"Prediction: emotion={emotion}, confidence={confidence:.3f}, has_audio={audio is not None}")
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again with different input.")

    pred_id = insert_prediction(
        text_input=transcript or text_input or None,
        audio_path=None,
        audio_url=audio_url,
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
async def history(
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    search: str = Query(default=""),
    emotion: str = Query(default=""),
):
    if search or emotion:
        items, total = search_predictions(query=search, emotion_filter=emotion, limit=limit, offset=offset)
    else:
        items = get_all_predictions(limit=limit, offset=offset)
        total = get_total_count()
    return HistoryResponse(items=[HistoryItem(**i) for i in items], total=total)


@app.get("/prediction/{prediction_id}", response_model=HistoryItem)
async def get_prediction(prediction_id: str):
    item = get_prediction_by_id(prediction_id)
    if not item:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    return HistoryItem(**item)
