from fastapi import Header, HTTPException, status

from app.config.security import get_user_id
from app.services.translation_history_service import (
    translation_history_service
)


async def get_translation_history(

    authorization: str = Header(...)

):

    if not authorization.startswith("Bearer "):

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Invalid Authorization Header"

        )

    token = authorization.split(" ")[1]

    user_id = get_user_id(token)

    if not user_id:

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Invalid or Expired Token"

        )

    return await translation_history_service(user_id)
