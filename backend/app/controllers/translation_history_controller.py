from app.services.translation_history_service import translation_history_service

async def get_translation_history():

    return await translation_history_service()