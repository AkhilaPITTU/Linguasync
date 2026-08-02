import hashlib
import json

from app.config.database import database
from app.models.Transcript import Transcript

transcripts_collection = database["transcripts"]


# ==========================================
# HASH HELPER
# ==========================================

def _compute_hash(record: dict, prev_hash: str) -> str:
    """
    Compute SHA-256 hash for a transcript record.
    The hash covers the record's content + the previous
    record's hash, so any edit to this record OR any
    earlier record breaks the chain.
    """

    payload = {
        "meeting_id": record["meeting_id"],
        "speaker_id": record["speaker_id"],
        "original_text": record["original_text"],
        "translated_text": record["translated_text"],
        "created_at": str(record["created_at"]),
        "prev_hash": prev_hash,
    }

    serialized = json.dumps(payload, sort_keys=True).encode("utf-8")

    return hashlib.sha256(serialized).hexdigest()


# ==========================================
# CREATE TRANSCRIPT ENTRY
# ==========================================

async def create_transcript_entry(
    meeting_id: str,
    speaker_id: str,
    speaker_name: str,
    source_language: str,
    target_language: str,
    original_text: str,
    translated_text: str,
    confidence: float = None
):

    # Get the last transcript entry for this meeting to chain from
    last_entry = await transcripts_collection.find_one(
        {"meeting_id": meeting_id},
        sort=[("created_at", -1)]
    )

    prev_hash = last_entry["hash"] if last_entry else "0" * 64

    transcript = Transcript(

        meeting_id=meeting_id,

        speaker_id=speaker_id,

        speaker_name=speaker_name,

        source_language=source_language,

        target_language=target_language,

        original_text=original_text,

        translated_text=translated_text,

        confidence=confidence,

        prev_hash=prev_hash

    )

    record = transcript.model_dump()

    record["hash"] = _compute_hash(record, prev_hash)

    await transcripts_collection.insert_one(record)

    return {
        "success": True,
        "message": "Transcript entry saved.",
        "transcript": {k: v for k, v in record.items() if k != "_id"}
    }


# ==========================================
# GET TRANSCRIPTS FOR A MEETING
# ==========================================

async def get_transcripts_by_meeting(meeting_id: str):

    cursor = transcripts_collection.find(
        {"meeting_id": meeting_id}
    ).sort("created_at", 1)

    entries = []

    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        entries.append(doc)

    return {
        "success": True,
        "count": len(entries),
        "transcripts": entries
    }


# ==========================================
# VERIFY HASH CHAIN INTEGRITY
# ==========================================

async def verify_transcript_chain(meeting_id: str):
    """
    Recomputes every hash in the chain in order and compares
    it against what's stored. Flags the first record where
    they diverge, which is where tampering (or corruption)
    happened.
    """

    cursor = transcripts_collection.find(
        {"meeting_id": meeting_id}
    ).sort("created_at", 1)

    expected_prev_hash = "0" * 64
    broken_at = None

    entries_checked = 0

    async for doc in cursor:

        entries_checked += 1

        if doc.get("prev_hash") != expected_prev_hash:
            broken_at = str(doc["_id"])
            break

        recomputed_hash = _compute_hash(doc, doc["prev_hash"])

        if recomputed_hash != doc.get("hash"):
            broken_at = str(doc["_id"])
            break

        expected_prev_hash = doc["hash"]

    is_valid = broken_at is None

    return {
        "success": True,
        "valid": is_valid,
        "entries_checked": entries_checked,
        "tampered_record_id": broken_at
    }