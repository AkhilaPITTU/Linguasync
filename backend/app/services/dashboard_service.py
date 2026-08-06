from app.config.database import meetings_collection


async def dashboard_statistics(user_id: str):

    # Meetings created by the user
    hosted_calls = await meetings_collection.count_documents(
        {
            "host_id": user_id
        }
    )

    hosted_video_calls = await meetings_collection.count_documents(
        {
            "host_id": user_id,
            "meeting_type": "video"
        }
    )

    hosted_audio_calls = await meetings_collection.count_documents(
        {
            "host_id": user_id,
            "meeting_type": "audio"
        }
    )

    # Meetings joined by the user (excluding meetings they hosted)
    joined_calls = await meetings_collection.count_documents(
        {
            "participants.user_id": user_id,
            "host_id": {"$ne": user_id}
        }
    )

    active_calls = await meetings_collection.count_documents(
        {
            "participants.user_id": user_id,
            "status": "active"
        }
    )

    completed_calls = await meetings_collection.count_documents(
        {
            "participants.user_id": user_id,
            "status": "completed"
        }
    )

    return {
        "success": True,
        "data": {
            "hosted_calls": hosted_calls,
            "joined_calls": joined_calls,
            "video_calls": hosted_video_calls,
            "audio_calls": hosted_audio_calls,
            "active_calls": active_calls,
            "completed_calls": completed_calls,
            "total_calls": hosted_calls + joined_calls
        }
    }