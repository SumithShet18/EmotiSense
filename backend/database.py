import sqlite3
import json
from datetime import datetime, timezone
from typing import Optional

from config import DATABASE_PATH


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db() -> None:
    conn = get_connection()
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


def insert_prediction(
    text_input: Optional[str],
    audio_path: Optional[str],
    emotion: str,
    confidence: float,
    probabilities: dict,
) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO emotion_logs (timestamp, text_input, audio_path, emotion, confidence, probabilities)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.now(timezone.utc).isoformat(),
            text_input,
            audio_path,
            emotion,
            confidence,
            json.dumps(probabilities),
        ),
    )
    conn.commit()
    conn.close()
    cur = cursor.lastrowid
    return 0 if cur is None else cur


def get_all_predictions(limit: int = 100, offset: int = 0) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT id, timestamp, text_input, audio_path, emotion, confidence, probabilities
        FROM emotion_logs
        ORDER BY id DESC
        LIMIT ? OFFSET ?
        """,
        (limit, offset),
    ).fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("probabilities"), str):
            d["probabilities"] = json.loads(d["probabilities"])
        results.append(d)
    return results


def get_prediction_by_id(prediction_id: int) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute(
        "SELECT id, timestamp, text_input, audio_path, emotion, confidence, probabilities FROM emotion_logs WHERE id = ?",
        (prediction_id,),
    ).fetchone()
    conn.close()
    if row is None:
        return None
    d = dict(row)
    if isinstance(d.get("probabilities"), str):
        d["probabilities"] = json.loads(d["probabilities"])
    return d


def get_total_count() -> int:
    conn = get_connection()
    row = conn.execute("SELECT COUNT(*) as count FROM emotion_logs").fetchone()
    conn.close()
    return row["count"]
