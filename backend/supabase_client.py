from postgrest import APIError
from supabase import create_client, Client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def init_supabase() -> None:
    client = get_client()
    client.table("emotion_logs").select("id").limit(1).execute()


def insert_prediction(
    transcript: str | None,
    audio_url: str | None,
    emotion: str,
    confidence: float,
    probabilities: dict,
) -> str:
    import uuid
    from datetime import datetime, timezone

    client = get_client()
    row_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "id": row_id,
        "timestamp": now,
        "transcript": transcript,
        "emotion": emotion,
        "confidence": confidence,
        "probabilities": probabilities,
        "audio_url": audio_url,
        "created_at": now,
    }
    client.table("emotion_logs").insert(data).execute()
    return row_id


def get_all_predictions(limit: int = 100, offset: int = 0) -> list[dict]:
    client = get_client()
    resp = (
        client.table("emotion_logs")
        .select("*", count="exact")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return resp.data


def get_prediction_by_id(prediction_id: str) -> dict | None:
    client = get_client()
    resp = (
        client.table("emotion_logs")
        .select("*")
        .eq("id", prediction_id)
        .execute()
    )
    return resp.data[0] if resp.data else None


def get_total_count() -> int:
    client = get_client()
    resp = (
        client.table("emotion_logs")
        .select("*", count="exact")
        .limit(1)
        .execute()
    )
    return resp.count if hasattr(resp, "count") else 0


def search_predictions(
    query: str = "",
    emotion_filter: str = "",
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[dict], int]:
    client = get_client()
    q = (
        client.table("emotion_logs")
        .select("*", count="exact")
        .order("created_at", desc=True)
    )
    if emotion_filter:
        q = q.eq("emotion", emotion_filter)
    if query:
        q = q.ilike("transcript", f"%{query}%")
    resp = q.range(offset, offset + limit - 1).execute()
    total = resp.count if hasattr(resp, "count") else len(resp.data)
    return resp.data, total


def upload_audio(bucket: str, file_name: str, file_data: bytes) -> str:
    client = get_client()
    client.storage.from_(bucket).upload(file_name, file_data, {"content-type": "audio/wav"})
    public_url = client.storage.from_(bucket).get_public_url(file_name)
    return public_url


def delete_audio(bucket: str, file_name: str) -> None:
    client = get_client()
    client.storage.from_(bucket).remove([file_name])


def insert_explanation(
    prediction_id: str,
    reasoning: str,
    token_importances: list,
    modality_contributions: dict,
    audio_features: dict | None,
    attention_matrix: list | None,
    uncertainty: dict,
    secondary_emotions: list,
) -> str:
    import uuid
    from datetime import datetime, timezone

    client = get_client()
    row_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "id": row_id,
        "prediction_id": prediction_id,
        "timestamp": now,
        "reasoning": reasoning,
        "token_importances": token_importances,
        "modality_contributions": modality_contributions,
        "audio_features": audio_features,
        "attention_matrix": attention_matrix,
        "uncertainty": uncertainty,
        "secondary_emotions": secondary_emotions,
        "created_at": now,
    }
    client.table("explanations").insert(data).execute()
    return row_id
