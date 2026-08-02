from app.services.translation_engine_service import translation_engine_service


async def get_translation_engine():

    return await translation_engine_service()