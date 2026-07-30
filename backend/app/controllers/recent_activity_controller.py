from app.services.recent_activity_service import recent_activity_service

async def get_recent_activity():

    return await recent_activity_service()