from app.config.database import chat_messages_collection


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
        .limit(5)
        .to_list(length=5)
    )

    exported_files = []

    for document in documents:

        created_at = document.get("created_at")

        exported_files.append({

            "id": str(document.get("_id")),

            "filename": f"Meeting chat {document.get('meeting_id', '-')}",

            "format": document.get(
                "file_format",
                "Chat message"
            ),

            "size": document.get(
                "file_size",
                "-"
            ),

            "created_at": (
                created_at.strftime("%d %b %Y %I:%M %p")
                if created_at
                else "-"
            )

        })

    return {

        "success": True,

        "message": "Exported chats fetched successfully",

        "data": exported_files

    }
