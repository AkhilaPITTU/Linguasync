from fastapi import APIRouter, Header

from app.controllers.invitation_controller import (
    get_users_controller,
    send_invitation_controller,
    pending_invitations_controller,
    accept_invitation_controller,
    reject_invitation_controller,
)

from app.schemas.invitation_schema import (
    SendInvitationSchema,
    AcceptInvitationSchema,
)

router = APIRouter(
    prefix="/api/invitation",
    tags=["Invitation"]
)


# ==========================================
# GET ALL USERS
# ==========================================

@router.get("/users")
async def get_users(
    authorization: str = Header(...)
):
    return await get_users_controller(
        authorization
    )


# ==========================================
# SEND INVITATION
# ==========================================

@router.post("/send")
async def send_invitation(
    data: SendInvitationSchema,
    authorization: str = Header(...)
):
    return await send_invitation_controller(
        data,
        authorization
    )


# ==========================================
# GET PENDING INVITATIONS
# ==========================================

@router.get("/pending")
async def pending_invitations(
    authorization: str = Header(...)
):
    return await pending_invitations_controller(
        authorization
    )


# ==========================================
# ACCEPT INVITATION
# ==========================================

@router.put("/accept/{invitation_id}")
async def accept_invitation(
    invitation_id: str,
    data: AcceptInvitationSchema,
):
    return await accept_invitation_controller(
        invitation_id,
        data,
    )


# ==========================================
# REJECT INVITATION
# ==========================================

@router.put("/reject/{invitation_id}")
async def reject_invitation(
    invitation_id: str
):
    return await reject_invitation_controller(
        invitation_id
    )
