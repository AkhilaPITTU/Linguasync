from app.services.system_status_service import system_status_service


async def get_system_status():

    return await system_status_service()