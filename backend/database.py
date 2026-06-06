import json
import sqlite3
from datetime import datetime, timezone
from typing import Optional

import logging
from config import USE_SUPABASE, SUPABASE_CONFIGURED

_use_supabase = USE_SUPABASE and SUPABASE_CONFIGURED
if USE_SUPABASE and not SUPABASE_CONFIGURED:
    logging.warning("USE_SUPABASE=true but SUPABASE_URL or SUPABASE_SERVICE_KEY missing. Falling back to SQLite.")

if _use_supabase:
    from supabase_client import (
        init_supabase,
        insert_prediction as supabase_insert,
        get_all_predictions as supabase_get_all,
        get_prediction_by_id as supabase_get_by_id,
        get_total_count as supabase_get_count,
        search_predictions as supabase_search,
        upload_audio as supabase_upload_audio,
    )

# ---------------------------------------------------------------------------
# SQLite fallback (used when USE_SUPABASE = false)
# ---------------------------------------------------------------------------

import os
from pathlib import Path
DATABASE_PATH = Path(__file__).resolve().parent.parent / "database" / "emotisense.db"


def _get_connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def _sqlite_init_db() -> None:
    conn = _get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS emotion_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            text_input TEXT,
            audio_path TEXT,
            emotion TEXT NOT NULL,
            confidence REAL NOT NULL,
            probabilities TEXT
        );
    """)
    conn.commit()
    conn.close()


def _sqlite_insert_prediction(
    text_input: Optional[str],
    audio_path: Optional[str],
    emotion: str,
    confidence: float,
    probabilities: dict,
) -> int:
    conn = _get_connection()
    cursor = conn.execute(
        """INSERT INTO emotion_logs (timestamp, text_input, audio_path, emotion, confidence, probabilities)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (datetime.now(timezone.utc).isoformat(), text_input, audio_path, emotion, confidence, json.dumps(probabilities)),
    )
    conn.commit()
    conn.close()
    return cursor.lastrowid or 0


def _sqlite_get_all_predictions(limit: int = 100, offset: int = 0) -> list[dict]:
    conn = _get_connection()
    rows = conn.execute(
        "SELECT * FROM emotion_logs ORDER BY id DESC LIMIT ? OFFSET ?", (limit, offset)
    ).fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("probabilities"), str):
            d["probabilities"] = json.loads(d["probabilities"])
        results.append(d)
    return results


def _sqlite_get_prediction_by_id(prediction_id: int) -> Optional[dict]:
    conn = _get_connection()
    row = conn.execute("SELECT * FROM emotion_logs WHERE id = ?", (prediction_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    d = dict(row)
    if isinstance(d.get("probabilities"), str):
        d["probabilities"] = json.loads(d["probabilities"])
    return d


def _sqlite_get_total_count() -> int:
    conn = _get_connection()
    row = conn.execute("SELECT COUNT(*) as count FROM emotion_logs").fetchone()
    conn.close()
    return row["count"]


def _sqlite_search_predictions(query: str = "", emotion_filter: str = "", limit: int = 100, offset: int = 0) -> tuple[list[dict], int]:
    conn = _get_connection()
    conditions = []
    params: list = []
    if emotion_filter:
        conditions.append("emotion = ?")
        params.append(emotion_filter)
    if query:
        conditions.append("text_input LIKE ?")
        params.append(f"%{query}%")
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    count_row = conn.execute(f"SELECT COUNT(*) as count FROM emotion_logs {where}", params).fetchone()
    total = count_row["count"]
    rows = conn.execute(
        f"SELECT * FROM emotion_logs {where} ORDER BY id DESC LIMIT ? OFFSET ?",
        params + [limit, offset],
    ).fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("probabilities"), str):
            d["probabilities"] = json.loads(d["probabilities"])
        results.append(d)
    return results, total


# ---------------------------------------------------------------------------
# Public API — routes to Supabase or SQLite
# ---------------------------------------------------------------------------

def init_db() -> None:
    if _use_supabase:
        init_supabase()
    else:
        _sqlite_init_db()


def insert_prediction(
    text_input: Optional[str] = None,
    audio_path: Optional[str] = None,
    emotion: str = "",
    confidence: float = 0.0,
    probabilities: Optional[dict] = None,
    audio_url: Optional[str] = None,
) -> str | int:
    if probabilities is None:
        probabilities = {}
    if _use_supabase:
        return supabase_insert(
            transcript=text_input,
            audio_url=audio_url,
            emotion=emotion,
            confidence=confidence,
            probabilities=probabilities,
        )
    return _sqlite_insert_prediction(text_input, audio_path, emotion, confidence, probabilities)


def get_all_predictions(limit: int = 100, offset: int = 0) -> list[dict]:
    if _use_supabase:
        return supabase_get_all(limit=limit, offset=offset)
    return _sqlite_get_all_predictions(limit=limit, offset=offset)


def get_prediction_by_id(prediction_id: str | int) -> Optional[dict]:
    if _use_supabase:
        return supabase_get_by_id(str(prediction_id))
    return _sqlite_get_prediction_by_id(int(prediction_id))


def get_total_count() -> int:
    if _use_supabase:
        return supabase_get_count()
    return _sqlite_get_total_count()


def search_predictions(query: str = "", emotion_filter: str = "", limit: int = 100, offset: int = 0) -> tuple[list[dict], int]:
    if _use_supabase:
        return supabase_search(query=query, emotion_filter=emotion_filter, limit=limit, offset=offset)
    return _sqlite_search_predictions(query=query, emotion_filter=emotion_filter, limit=limit, offset=offset)


def upload_audio(bucket: str, file_name: str, file_data: bytes) -> str:
    if _use_supabase:
        return supabase_upload_audio(bucket, file_name, file_data)
    save_dir = Path(__file__).resolve().parent.parent / "database" / "uploads"
    save_dir.mkdir(parents=True, exist_ok=True)
    path = save_dir / file_name
    with open(path, "wb") as f:
        f.write(file_data)
    return str(path)
