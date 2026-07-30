from datetime import datetime

from app.config.database import (
    meetings_collection,
    translations_collection
)


async def recent_activity_service():

    activities = []

    meetings = (
        await meetings_collection
        .find({})
        .sort("started_at", -1)
        .limit(3)
        .to_list(length=3)
    )

    for meeting in meetings:

        meeting_time = meeting.get("started_at")

        activities.append({

            "id": str(meeting.get("_id")),

            "activity": (
                "Video Call Completed"
                if meeting.get("meeting_type", "").lower() == "video"
                else "Audio Call Completed"
            ),

            "description": f"Meeting ID : {meeting.get('meeting_id', '-')}",

            "status": meeting.get("status", "Completed"),

            # Keep datetime only for sorting
            "_timestamp": meeting_time or datetime.min

        })

    translations = (
        await translations_collection
        .find({})
        .sort("created_at", -1)
        .limit(2)
        .to_list(length=2)
    )

    for translation in translations:

        translation_time = translation.get("created_at")

        activities.append({

            "id": str(translation.get("_id")),

            "activity": "Translation Finished",

            "description": (
                f"{translation.get('source_language', 'English')} → "
                f"{translation.get('target_language', 'Telugu')}"
            ),

            "status": "Success",

            # Keep datetime only for sorting
            "_timestamp": translation_time or datetime.min

        })

    # Sort using datetime
    activities.sort(
        key=lambda activity: activity["_timestamp"],
        reverse=True
    )

    # Convert datetime to string after sorting
    for activity in activities:

        if activity["_timestamp"] != datetime.min:
            activity["time"] = activity["_timestamp"].strftime(
                "%d %b %Y %I:%M %p"
            )
        else:
            activity["time"] = "-"

        del activity["_timestamp"]

    return {

        "success": True,

        "message": "Recent activity fetched successfully",

        "data": activities[:5]

    }