from fastapi import HTTPException, status

from app.config.security import get_user_id

from app.services.invitation_service import (
    get_users_service,
    send_invitation_service,
    pending_invitations_service,
    accept_invitation_service,
    reject_invitation_service,
)


async def get_users_controller(authorization: str):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization Header"
        )

    token = authorization.split(" ")[1]

    current_user_id = get_user_id(token)

    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired Token"
        )

    return await get_users_service(current_user_id)


async def send_invitation_controller(
    data,
    authorization: str
):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization Header"
        )

    token = authorization.split(" ")[1]

    current_user_id = get_user_id(token)

    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired Token"
        )

    # Pass host id from JWT
    return await send_invitation_service(data, current_user_id)


async def pending_invitations_controller(
    authorization: str
):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization Header"
        )

    token = authorization.split(" ")[1]

    current_user_id = get_user_id(token)

    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired Token"
        )

    return await pending_invitations_service(current_user_id)


async def accept_invitation_controller(
    invitation_id: str
):

    return await accept_invitation_service(invitation_id)


async def reject_invitation_controller(
    invitation_id: str
):

    return await reject_invitation_service(invitation_id)