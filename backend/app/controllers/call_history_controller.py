from app.services.call_history_service import recent_calls_service

async def get_recent_calls():

    return await recent_calls_service()