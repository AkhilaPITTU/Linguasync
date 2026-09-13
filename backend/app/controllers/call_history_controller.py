from fastapi import Header, HTTPException, status

from app.config.security import get_user_id

from app.services.call_history_service import recent_calls_service


async def get_recent_calls(

    authorization: str = Header(...)

):

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization Header",
        )

    user_id = get_user_id(authorization.split(" ", 1)[1])

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired Token",
        )

    return await recent_calls_service(user_id)
