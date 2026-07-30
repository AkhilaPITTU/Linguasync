from bson import ObjectId

from app.config.database import meetings_collection


async def dashboard_statistics(user_id: str):

    total_calls = await meetings_collection.count_documents(
        {
            "host_id": user_id
        }
    )

    video_calls = await meetings_collection.count_documents(
        {
            "host_id": user_id,
            "meeting_type": "video"
        }
    )

    audio_calls = await meetings_collection.count_documents(
        {
            "host_id": user_id,
            "meeting_type": "audio"
        }
    )

    return {

        "success": True,

        "data": {

            "total_calls": total_calls,

            "video_calls": video_calls,

            "audio_calls": audio_calls

        }

    }