from fastapi import Header

from app.config.security import get_user_id

from app.services.call_history_service import recent_calls_service


async def get_recent_calls(

    authorization: str = Header(...)

):

    token = authorization.split(" ")[1]

    user_id = get_user_id(token)

    return await recent_calls_service(user_id)