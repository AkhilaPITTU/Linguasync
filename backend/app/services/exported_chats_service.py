from app.config.database import chat_messages_collection
from app.utils.timezone_format import format_ist


async def exported_chats_service(user_id: str):

    documents = (
        await chat_messages_collection
        .find(
            {"$or": [
                {"sender_id": user_id},
                {"recipient_ids": user_id},
            ]}
        )
        .sort("created_at", -1)
        .to_list(length=None)
    )

    chat_history = []

    for document in documents:

        created_at = document.get("created_at")

        chat_history.append({

            "id": str(document.get("_id")),

            "meeting_id": document.get("meeting_id", "-"),
            "sender_name": document.get("sender_name", "Participant"),
            "text": document.get("original_text") or document.get("text") or "",

            # Displayed in IST -- see app.utils.timezone_format -- to
            # match every other conversation-related timestamp in the app;
            # created_at itself is left as the stored UTC value.
            "created_at": format_ist(created_at)

        })

    return {

        "success": True,

        "message": "Chat history fetched successfully",

        "data": chat_history

    }
