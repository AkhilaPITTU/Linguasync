from datetime import datetime, timezone
from uuid import uuid4

from bson import ObjectId

from app.config.database import database, users_collection
from app.models.Meeting import Meeting

meetings_collection = database["meetings"]


# ==========================================
# CREATE MEETING
# ==========================================

async def create_meeting(
    host_id: str,
    meeting_type: str,
    preferred_language: str,
    output_mode: str
):

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
                "mic_enabled": True,
                "camera_enabled": True,
                "screen_share": False,
                "speaking": False
            }
        ],

        meeting_type=meeting_type,

        status="active",

        source_language="Detecting...",

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
    language: str
):
    print("\n========== JOIN MEETING ==========")
    print("Meeting ID:", meeting_id)
    print("User ID:", user_id)

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

    meeting = await meetings_collection.find_one(
        {
            "meeting_id": meeting_id,
            "status": "active"
        }
    )

    if not meeting:
        return {
            "success": False,
            "message": "Meeting not found."
        }

    exists = any(
        participant["user_id"] == user_id
        for participant in meeting["participants"]
    )

    if not exists:

        participant = {
            "user_id": user_id,
            "user_name": user_name,
            "language": language,
            "mic_enabled": True,
            "camera_enabled": True,
            "screen_share": False,
            "speaking": False
        }

        await meetings_collection.update_one(
            {"meeting_id": meeting_id},
            {
                "$push": {
                    "participants": participant
                }
            }
        )

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

    # If 0 or 1 participants remain, end the meeting
    if participant_count <= 1:

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


# ==========================================
# GET ACTIVE MEETING
# ==========================================

async def get_active_meeting(user_id: str):

    meeting = await meetings_collection.find_one(
        {
            "status": "active",
            "$or": [
                {"host_id": user_id},
                {"participants.user_id": user_id}
            ]
        },
        {
            "_id": 0
        }
    )

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
            "source_language": meeting.get("source_language", "Detecting..."),
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