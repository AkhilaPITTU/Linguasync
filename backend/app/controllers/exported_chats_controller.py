from app.services.exported_chats_service import exported_chats_service

async def get_exported_chats():

    return await exported_chats_service()