from datetime import datetime, timezone
import logging
from uuid import uuid4

from bson import ObjectId

from app.config.database import (
    chat_messages_collection,
    database,
    transcripts_collection,
    translations_collection,
    users_collection,
)
from app.models.Meeting import Meeting
from app.ai.language_config import SUPPORTED_LANGUAGES, language_code

meetings_collection = database["meetings"]
logger = logging.getLogger(__name__)

LANGUAGE_CODES = SUPPORTED_LANGUAGES


def _source_language_code(preferred_language: str) -> str:
    return language_code(preferred_language)


# ==========================================
# CREATE MEETING
# ==========================================

async def create_meeting(
    host_id: str,
    meeting_type: str,
    preferred_language: str,
    output_mode: str
):

    if not _source_language_code(preferred_language):
        return {"success": False, "message": "Unsupported meeting language."}

    # Get Host Details
    user = await users_collection.find_one(
        {"_id": ObjectId(host_id)}
    )

    if not user:
        return {
            "success": False,
            "message": "Host not found."
        }

    host_name = user["full_name"]

    meeting = Meeting(

        meeting_id=str(uuid4()),

        host_id=host_id,

        participants=[
            {
                "user_id": host_id,
                "user_name": host_name,
                "language": preferred_language,
                "preferred_language": preferred_language,
                "source_language": _source_language_code(preferred_language),
                "output_mode": output_mode,
                "mic_enabled": True,
                "camera_enabled": True,
                "screen_share": False,
                "speaking": False
            }
        ],

        meeting_type=meeting_type,

        status="active",

        # This is the host's explicitly selected source language.  The live
        # pipeline never performs automatic language detection.
        source_language=_source_language_code(preferred_language),

        preferred_language=preferred_language,

        output_mode=output_mode,

        translation_status="Running",

        microphone_status="ON",

        camera_status="ON",

        started_at=datetime.now(timezone.utc),

        ended_at=None

    )

    await meetings_collection.insert_one(
        meeting.model_dump()
    )

    return {
        "success": True,
        "message": "Meeting created successfully.",
        "meeting": meeting.model_dump()
    }


# ==========================================
# JOIN MEETING
# ==========================================

async def join_meeting(
    meeting_id: str,
    user_id: str,
    user_name: str,
    preferred_language: str,
    source_language: str | None,
    output_mode: str,
):
    print("\n========== JOIN MEETING ==========")
    print("Meeting ID:", meeting_id)
    print("User ID:", user_id)
    print(
        "[LANGUAGE-PIPELINE] stage=join_request "
        f"user_id={user_id} preferred_language={preferred_language!r} "
        f"source_language={source_language!r} output_mode={output_mode!r}"
    )
    logger.info(
        "Join request -> user_id=%s preferred_language=%s source_language=%s",
        user_id,
        preferred_language,
        source_language,
    )

    meeting = await meetings_collection.find_one(
        {
            "meeting_id": meeting_id,
            "status": "active"
        }
    )

    print("Meeting Found:", meeting)

    if not meeting:
        return {
            "success": False,
            "message": "Meeting not found."
        }

    normalized_user_id = str(user_id)
    participant_ids = [
        str(participant.get("user_id", ""))
        for participant in meeting.get("participants", [])
    ]
    print("[MEETING-IDENTITY]", {
        "current_user_id": normalized_user_id,
        "host_id": str(meeting.get("host_id", "")),
        "participants": participant_ids,
    })

    exists = any(
        str(participant.get("user_id", "")) == normalized_user_id
        for participant in meeting["participants"]
    )

    # The browser supplies the ISO code for the one language selected before
    # joining. Retain it rather than replacing it with a default value.
    resolved_source_language = _source_language_code(
        source_language or preferred_language
    )
    if not resolved_source_language:
        return {"success": False, "message": "Unsupported participant language."}

    participant = {
        "user_id": user_id,
        "user_name": user_name,
        # Keep language for existing UI and older meeting records.
        "language": preferred_language,
        "preferred_language": preferred_language,
        "source_language": resolved_source_language,
        "output_mode": output_mode,
        "mic_enabled": True,
        "camera_enabled": True,
        "screen_share": False,
        "speaking": False
    }

    print(
        "[LANGUAGE-PIPELINE] stage=mongodb_participant_write "
        f"user_id={user_id} preferred_language={participant['preferred_language']!r} "
        f"source_language={participant['source_language']!r}"
    )

    if not exists:

        result = await meetings_collection.update_one(
            {"meeting_id": meeting_id},
            {
                "$push": {
                    "participants": participant
                }
            }
        )

        print("Modified Count:", result.modified_count)

    else:
        # Invitation acceptance can add the participant before this
        # idempotent join request. Preserve the selected per-call settings.
        await meetings_collection.update_one(
            {
                "meeting_id": meeting_id,
                "participants.user_id": user_id,
            },
            {
                "$set": {
                    "participants.$.language": preferred_language,
                    "participants.$.preferred_language": preferred_language,
                    "participants.$.source_language": resolved_source_language,
                    "participants.$.output_mode": output_mode,
                }
            }
        )

    updated_meeting = await meetings_collection.find_one(
        {"meeting_id": meeting_id}
    )

    saved_participant = next(
        (
            item for item in updated_meeting.get("participants", [])
            if str(item.get("user_id", "")) == normalized_user_id
        ),
        {},
    )
    logger.info(
        "MongoDB participant after save -> user_id=%s preferred_language=%s "
        "source_language=%s",
        user_id,
        saved_participant.get("preferred_language"),
        saved_participant.get("source_language"),
    )

    print("Participants After Join:")
    print(updated_meeting["participants"])

    return {
        "success": True,
        "message": "Joined meeting successfully."
    }


# ==========================================
# LEAVE MEETING
# ==========================================

async def leave_meeting(
    meeting_id: str,
    user_id: str
):

    meeting = await meetings_collection.find_one(
        {
            "meeting_id": meeting_id
        }
    )

    if not meeting:

        return {
            "success": False,
            "message": "Meeting not found."
        }

    # First remove the participant
    await meetings_collection.update_one(
        {
            "meeting_id": meeting_id
        },
        {
            "$pull": {
                "participants": {
                    "user_id": user_id
                }
            }
        }
    )

    # Get updated meeting
    updated_meeting = await meetings_collection.find_one(
        {
            "meeting_id": meeting_id
        }
    )

    participant_count = len(updated_meeting["participants"])

    # Leaving is distinct from ending a meeting. A remaining participant may
    # still be waiting for others to join, so only an empty meeting is closed
    # here; the host uses the explicit end endpoint to finish it for everyone.
    if participant_count == 0:

        await meetings_collection.update_one(
            {
                "meeting_id": meeting_id
            },
            {
                "$set": {
                    "status": "completed",
                    "translation_status": "Stopped",
                    "ended_at": datetime.now(timezone.utc)
                }
            }
        )

        return {
            "success": True,
            "message": "Meeting ended successfully."
        }

    return {
        "success": True,
        "message": "Left meeting successfully.",
        "participants": participant_count
    }
# ==========================================
# END MEETING
# ==========================================

async def end_meeting(
    meeting_id: str,
    host_id: str
):

    meeting = await meetings_collection.find_one(
        {
            "meeting_id": meeting_id,
            "host_id": host_id
        }
    )

    if not meeting:
        return {
            "success": False,
            "message": "Meeting not found."
        }

    await meetings_collection.update_one(
        {
            "meeting_id": meeting_id
        },
        {
            "$set": {
                "status": "completed",
                "translation_status": "Stopped",
                "ended_at": datetime.now(timezone.utc)
            }
        }
    )

    return {
        "success": True,
        "message": "Meeting ended successfully."
    }

# ==========================================
# GET MEETING
# ==========================================

async def get_meeting(
    meeting_id: str
):

    meeting = await meetings_collection.find_one(
        {
            "meeting_id": meeting_id
        },
        {
            "_id": 0
        }
    )

    if not meeting:
        return {
            "success": False,
            "message": "Meeting not found."
        }

    return {
        "success": True,
        "meeting": meeting
    }


# ==========================================
# GET PARTICIPANTS
# ==========================================

async def get_participants(
    meeting_id: str
):

    meeting = await meetings_collection.find_one(
        {
            "meeting_id": meeting_id
        },
        {
            "_id": 0
        }
    )

    if not meeting:
        return {
            "success": False,
            "message": "Meeting not found."
        }

    return {
        "success": True,
        "participants": meeting["participants"]
    }


async def get_meeting_history(meeting_id: str, user_id: str):
    """Return only conversation records the current meeting participant may see."""
    meeting = await meetings_collection.find_one(
        {"meeting_id": meeting_id}, {"_id": 0, "participants.user_id": 1}
    )
    if not meeting:
        return {"success": False, "message": "Meeting not found."}

    participant_ids = {str(item.get("user_id")) for item in meeting.get("participants", [])}
    if str(user_id) not in participant_ids:
        return {"success": False, "message": "You are not a participant in this meeting."}

    transcripts = await transcripts_collection.find(
        {"meeting_id": meeting_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(length=None)
    translations = await translations_collection.find(
        {"meeting_id": meeting_id, "recipient_id": str(user_id)}, {"_id": 0}
    ).sort("created_at", 1).to_list(length=None)
    chat_records = await chat_messages_collection.find(
        {"meeting_id": meeting_id, "$or": [
            {"sender_id": str(user_id)},
            {"recipient_ids": str(user_id)},
        ]}, {"_id": 0}
    ).sort("timestamp", 1).to_list(length=None)

    chats = []
    for record in chat_records:
        delivery = next(
            (item for item in record.get("deliveries", [])
             if str(item.get("recipient_id")) == str(user_id)),
            None,
        )
        chats.append({
            "type": "chat",
            "meeting_id": meeting_id,
            "message_id": record.get("message_id"),
            "user_id": record.get("sender_id"),
            "sender_id": record.get("sender_id"),
            "name": record.get("sender_name", "Participant"),
            "user_name": record.get("sender_name", "Participant"),
            "recipient_id": str(user_id),
            "source_language": record.get("source_language"),
            "original_text": record.get("original_text", ""),
            "text": (delivery or {}).get("text") or record.get("original_text", ""),
            "translated_text": (delivery or {}).get("text"),
            "is_translated": bool((delivery or {}).get("is_translated")),
            "time": record.get("timestamp", ""),
        })

    return {
        "success": True,
        "transcripts": transcripts,
        "translations": translations,
        "chat_messages": chats,
    }


# ==========================================
# GET ACTIVE MEETING
# ==========================================

async def get_active_meeting(user_id: str):

    normalized_user_id = str(user_id)
    meeting = None
    cursor = meetings_collection.find({"status": "active"}, {"_id": 0})

    async for candidate in cursor:
        host_id = str(candidate.get("host_id", ""))
        participant_ids = [
            str(participant.get("user_id", ""))
            for participant in candidate.get("participants", [])
        ]
        is_participant = normalized_user_id in participant_ids
        print("========== ACTIVE MEETING CHECK ==========")
        print({
            "current_user_id": normalized_user_id,
            "meeting_id": candidate.get("meeting_id"),
            "host_id": host_id,
            "participants": participant_ids,
            "is_host": host_id == normalized_user_id,
            "is_participant": is_participant,
            "result": is_participant,
        })
        # A host is initially a participant too. Requiring present
        # membership prevents an old active record from resurfacing after
        # that host has left a multi-party meeting.
        if is_participant:
            meeting = candidate
            break

    if meeting is None:
        return {
            "success": True,
            "meeting": None
        }
    # Hide completed/empty meetings
    if len(meeting["participants"]) == 0:
        await meetings_collection.update_one(
            {
                "meeting_id": meeting["meeting_id"]
            },
            {
                "$set": {
                    "status": "completed",
                    "translation_status": "Stopped",
                    "ended_at": datetime.now(timezone.utc)
                }
            }
        )

        return {
            "success": True,
            "meeting": None
        }

    host = await users_collection.find_one(
        {"_id": ObjectId(meeting["host_id"])},
        {"full_name": 1}
    )

    host_name = "Meeting Host"

    if host:
        host_name = host.get("full_name", "Meeting Host")

    started_at = meeting["started_at"]

    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)

    duration = int(
        (datetime.now(timezone.utc) - started_at).total_seconds()
    )

    hours = duration // 3600
    minutes = (duration % 3600) // 60
    seconds = duration % 60

    duration_text = f"{hours:02}:{minutes:02}:{seconds:02}"

    return {
        "success": True,
        "meeting": {
            "meeting_id": meeting["meeting_id"],
            "host_id": meeting["host_id"],
            "host_name": host_name,
            "meeting_type": meeting["meeting_type"],
            "participants": len(meeting["participants"]),
            "participant_list": meeting["participants"],
            "status": meeting["status"],
            "source_language": meeting.get("source_language") or _source_language_code(
                meeting.get("preferred_language", "")
            ),
            "preferred_language": meeting.get(
                "preferred_language",
                meeting.get("target_language", "English")
            ),
            "output_mode": meeting.get(
                "output_mode",
                "original"
            ),
            "translation_status": meeting.get(
                "translation_status",
                "Running"
            ),
            "microphone_status": meeting.get(
                "microphone_status",
                "ON"
            ),
            "camera_status": meeting.get(
                "camera_status",
                "ON"
            ),
            "duration": duration_text
        }
    }
