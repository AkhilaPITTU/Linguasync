import time

from app.config.database import (
    database,
    meetings_collection
)


async def system_status_service():

    start_time = time.perf_counter()

    server_status = "Online"

    database_status = "Disconnected"

    try:

        await database.command("ping")

        database_status = "Connected"

    except Exception:

        database_status = "Disconnected"

    latency = round(
        (time.perf_counter() - start_time) * 1000,
        2
    )

    ongoing_calls = await meetings_collection.count_documents(
        {"status": "active"}
    )

    return {

        "success": True,

        "message": "System status fetched successfully",

        "data": {

            "server_status": server_status,

            "database": database_status,

            # Update these later when integrated with your models
            "translation_engine": "Running",

            "speech_recognition": "Active",

            "voice_clone": "Ready",

            "api_latency": f"{latency} ms",

            "ongoing_calls": ongoing_calls

        }

    }