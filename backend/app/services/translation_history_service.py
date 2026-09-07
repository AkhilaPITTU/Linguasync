from app.config.database import translations_collection


async def translation_history_service(user_id: str):

    translations = (
        await translations_collection
        .find(
            {"$or": [
                {"user_id": user_id},
                {"recipient_id": user_id},
            ]}
        )
        .sort("created_at", -1)
        .limit(5)
        .to_list(length=5)
    )

    history = []

    for item in translations:

        created_at = item.get("created_at")

        history.append({

            "id": str(item.get("_id")),

            "source_language": item.get(
                "source_language",
                "English"
            ),

            "target_language": item.get(
                "target_language",
                "Telugu"
            ),

            "type": item.get(
                "translation_type",
                "Speech"
            ),

            "words": item.get(
                "word_count",
                0
            ),

            "time": (
                created_at.strftime("%d %b %Y %I:%M %p")
                if created_at
                else "-"
            )

        })

    return {

        "success": True,

        "message": "Translation history fetched successfully",

        "data": history

    }
