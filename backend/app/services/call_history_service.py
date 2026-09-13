from bson import ObjectId

from app.config.database import meetings_collection, users_collection
from app.utils.timezone_format import format_ist


async def recent_calls_service(user_id: str):

    meetings = (
        await meetings_collection
        .find(
            {
                "$or": [
                    {"host_id": user_id},
                    {"participants.user_id": user_id}
                ]
            }
        )
        # Include every meeting the authenticated user hosted or joined.
        # The previous five-record limit made older call history disappear.
        .sort("started_at", -1)
        .to_list(length=None)
    )

    recent_calls = []

    for meeting in meetings:

        host_name = "Unknown"

        host_id = meeting.get("host_id")

        if host_id:
            try:
                user = await users_collection.find_one(
                    {"_id": ObjectId(host_id)}
                )

                if user:
                    host_name = user.get("full_name", "Unknown")

            except Exception:
                host_name = "Unknown"

        meeting_type = meeting.get("meeting_type", "video")

        mode = (
            "Video"
            if meeting_type.lower() == "video"
            else "Audio"
        )

        source_language = meeting.get(
            "source_language",
            ""
        )

        target_language = meeting.get(
            "preferred_language",
            meeting.get("target_language", "English")
        )

        language = f"{source_language} → {target_language}"

        duration = "Ongoing"

        started_at = meeting.get("started_at")
        ended_at = meeting.get("ended_at")

        if started_at and ended_at:

            seconds = int(
                (ended_at - started_at).total_seconds()
            )

            hours = seconds // 3600
            minutes = (seconds % 3600) // 60

            if hours > 0:
                duration = f"{hours} hr {minutes} min"
            else:
                duration = f"{minutes} min"

        if started_at:
            # Displayed in IST -- see app.utils.timezone_format -- for the
            # same reason and via the same helper as the conversation
            # export/verify feature; started_at itself is left as the
            # stored UTC value.
            time = format_ist(started_at)
        else:
            time = "-"

        recent_calls.append({

            "id": meeting.get("meeting_id"),

            "name": host_name,

            "mode": mode,

            "language": language,

            "duration": duration,

            "time": time

        })

    return {

        "success": True,

        "data": recent_calls

    }
