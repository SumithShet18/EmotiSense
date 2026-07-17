import uuid
import logging
import os
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import random

import numpy as np

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import ALLOWED_AUDIO_EXTENSIONS, MAX_AUDIO_SIZE_MB, SUPABASE_STORAGE_BUCKET
from database import (
    init_db, insert_prediction, insert_explanation,
    get_all_predictions, get_prediction_by_id, get_total_count,
    search_predictions, upload_audio,
    insert_performance_log, get_performance_logs,
    get_last_prediction_id,
)
from schemas import (
    HealthResponse, PredictResponse, HistoryItem, HistoryResponse,
    PerformanceSummary, StageMetrics, PerformanceLog, PerformanceLogsResponse,
    FullResultResponse,
)
from inference import predict_emotion
from xai_schemas import XAIResponse
from xai import explain_prediction, compute_faithful, build_xai_response

random.seed(42)
np.random.seed(42)

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("emotisense")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "https://frontend-rose-nine-21.vercel.app,http://localhost:5173,http://localhost:3000").split(",")

_last_full_result: dict | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting EmotiSense API")
    init_db()
    logger.info("Pre-loading Whisper model...")
    try:
        from transcription import _get_whisper_model
        _get_whisper_model()
        logger.info("Whisper model loaded successfully")
    except Exception as e:
        logger.warning(f"Whisper pre-load failed (will load on demand): {e}")
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
    global _last_full_result
    text_input = text.strip() if text else ""
    audio_url = None

    if not text_input and not audio:
        raise HTTPException(
            status_code=400,
            detail="Provide audio (or text) for emotion analysis.",
        )

    audio_local = None
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
        from config import UPLOAD_DIR
        audio_local = str(UPLOAD_DIR / safe_name)
        with open(audio_local, "wb") as f:
            f.write(content)
        try:
            audio_url = upload_audio(SUPABASE_STORAGE_BUCKET, safe_name, content)
            logger.info(f"Uploaded audio {safe_name} to Supabase storage")
        except Exception as e:
            logger.error(f"Failed to upload audio to Supabase: {e}")

    try:
        emotion, confidence, probabilities, transcript, stage_metrics, totals, _modality_contribution = predict_emotion(
            text=text_input or None,
            audio_path=audio_local,
        )
        logger.info(f"Prediction: emotion={emotion}, confidence={confidence:.3f}, has_audio={audio is not None}")
        logger.info(f"TRANSCRIPT: {transcript}")
        logger.info(f"PROBABILITIES: {probabilities}")

        transcription_warning = None
        if audio and (not transcript or transcript == "(no speech detected)" or transcript.startswith("(transcription error")):
            transcription_warning = "No speech detected in audio recording."
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again with different input.")

    pred_id = insert_prediction(
        text_input=text_input or transcript or None,
        audio_path=None,
        audio_url=audio_url,
        emotion=emotion,
        confidence=confidence,
        probabilities=probabilities,
    )

    for st in stage_metrics:
        insert_performance_log(
            prediction_id=int(pred_id) if isinstance(pred_id, (int, str)) else 0,
            component=st["component"],
            latency_ms=st["latency_ms"],
            memory_mb=st["memory_mb"],
            cpu_usage=st["cpu_usage"],
            energy_joules=st["energy_joules"],
        )

    inline_explanation = None
    try:
        xai_result = explain_prediction(
            text=text_input or None,
            audio_path=audio_local,
        )
        inline_explanation = xai_result["explanation"]["inline"]
    except Exception as e:
        logger.warning(f"XAI generation failed: {e}")

    if xai_result:
        try:
            expl = xai_result["explanation"]
            inline = expl["inline"]
            insert_explanation(
                prediction_id=str(pred_id),
                reasoning=expl["reasoning"],
                token_importances=inline["text_token_attention"],
                modality_contributions=inline["modality_gate"],
                audio_features=inline["audio_features"],
                attention_matrix=inline["cross_modal_attention"],
                uncertainty=inline["uncertainty"],
                secondary_emotions=inline["secondary_emotions"],
                ig_attributions=None,
            )
        except Exception as e:
            logger.warning(f"Failed to store XAI explanation: {e}")

    _last_full_result = {
        "prediction_id": pred_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "text_input": text_input or transcript or None,
        "audio_url": audio_url,
        "emotion": emotion,
        "confidence": confidence,
        "probabilities": probabilities,
        "transcript": transcript,
        "transcription_warning": transcription_warning,
        "performance": {
            "stages": stage_metrics,
            **totals,
        },
        "xai": xai_result["explanation"] if xai_result else None,
    }

    return PredictResponse(
        id=pred_id,
        transcript=transcript,
        emotion=emotion,
        confidence=confidence,
        probabilities=probabilities,
        transcription_warning=transcription_warning,
        performance=PerformanceSummary(
            stages=[StageMetrics(**st) for st in stage_metrics],
            **totals,
        ),
        inline_explanation=inline_explanation,
    )


@app.get("/last-result", response_model=FullResultResponse)
async def get_last_result():
    if _last_full_result is None:
        last_id = get_last_prediction_id()
        if last_id is None:
            raise HTTPException(status_code=404, detail="No predictions yet.")
        pred = get_prediction_by_id(last_id)
        if pred is None:
            raise HTTPException(status_code=404, detail="No predictions yet.")
        return FullResultResponse(
            prediction_id=pred["id"],
            timestamp=pred.get("timestamp"),
            text_input=pred.get("text_input"),
            audio_url=pred.get("audio_url"),
            emotion=pred["emotion"],
            confidence=pred["confidence"],
            probabilities=pred.get("probabilities", {}),
            transcript=pred.get("text_input"),
            performance=None,
            xai=None,
        )
    return FullResultResponse(**_last_full_result)


@app.get("/performance", response_model=PerformanceLogsResponse)
async def get_performance(prediction_id: int = Query(default=None)):
    logs = get_performance_logs(prediction_id=prediction_id)
    return PerformanceLogsResponse(items=[PerformanceLog(**log) for log in logs])


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


@app.post("/explain", response_model=XAIResponse)
async def explain(
    text: str = Form(default="", max_length=5000),
    audio: UploadFile = File(default=None),
):
    text_input = text.strip() if text else ""
    if not text_input and not audio:
        raise HTTPException(status_code=400, detail="Provide text or audio for explainable analysis.")

    audio_local = None
    audio_url = None
    if audio:
        ext = Path(audio.filename).suffix.lower() if audio.filename else ".wav"
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported format '{ext}'.")
        content = await audio.read()
        if len(content) > MAX_AUDIO_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File exceeds {MAX_AUDIO_SIZE_MB} MB.")
        file_id = uuid.uuid4().hex
        safe_name = f"{file_id}{ext}"
        from config import UPLOAD_DIR
        audio_local = str(UPLOAD_DIR / safe_name)
        with open(audio_local, "wb") as f:
            f.write(content)
        try:
            audio_url = upload_audio(SUPABASE_STORAGE_BUCKET, safe_name, content)
        except Exception:
            pass

    try:
        base = explain_prediction(text=text_input or None, audio_path=audio_local)
    except Exception as e:
        logger.error(f"XAI failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Explainability analysis failed.")

    try:
        faithful = compute_faithful(text=text_input or None, audio_path=audio_local)
        base["explanation"]["faithful"] = faithful
        ig_sum = sum(
            abs(t.get("attribution", 0) or 0)
            for t in (faithful.get("text_token_attributions") or [])
        )
        if faithful.get("baseline_prediction"):
            base["explanation"]["ig_convergence"] = round(min(ig_sum, 1.0), 4)
        else:
            base["explanation"]["ig_convergence"] = None
        base["explanation"]["ig_steps"] = 32
    except Exception as e:
        logger.warning(f"Faithful attribution failed: {e}")
        base["explanation"]["faithful"] = None
        base["explanation"]["ig_convergence"] = None
        base["explanation"]["ig_steps"] = None

    return build_xai_response(base)


@app.get("/prediction/{prediction_id}", response_model=HistoryItem)
async def get_prediction(prediction_id: str):
    item = get_prediction_by_id(prediction_id)
    if not item:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    return HistoryItem(**item)
