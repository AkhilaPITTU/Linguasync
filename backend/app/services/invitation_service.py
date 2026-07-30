from datetime import datetime
from bson import ObjectId

from app.config.database import (
    invitations_collection,
    users_collection,
    meetings_collection
)


# ==========================================
# GET ALL USERS
# ==========================================

async def get_users_service(current_user_id: str):

    print("\n========== GET USERS API CALLED ==========")
    print("Current User ID:", current_user_id)

    users = []

    try:

        cursor = users_collection.find(
            {
                "_id": {
                    "$ne": ObjectId(current_user_id)
                }
            }
        )

        async for user in cursor:

            print("User Found:", user)

            users.append({
                "user_id": str(user["_id"]),
                "full_name": user.get("full_name", ""),
                "email": user.get("email", "")
            })

        print("Total Users Returned:", len(users))
        print(users)
        print("=========================================\n")

        return {
            "success": True,
            "users": users
        }

    except Exception as e:

        print("\nERROR IN GET USERS SERVICE")
        print(str(e))
        print("=========================================\n")

        return {
            "success": False,
            "message": str(e),
            "users": []
        }


# ==========================================
# SEND INVITATION
# ==========================================

async def send_invitation_service(data, host_id: str):

    print("\n========== SEND INVITATION ==========")
    print("Host:", host_id)
    print("Meeting:", data.meeting_id)
    print("Participants:", data.participants)

    invitation_ids = []

    for participant in data.participants:

        existing = await invitations_collection.find_one({
            "meeting_id": data.meeting_id,
            "invited_user_id": participant,
            "status": "pending"
        })

        if existing:
            print("Invitation already exists:", participant)
            continue

        invitation = {
            "meeting_id": data.meeting_id,
            "host_id": host_id,
            "invited_user_id": participant,
            "status": "pending",
            "created_at": datetime.utcnow()
        }

        result = await invitations_collection.insert_one(invitation)

        invitation_ids.append(str(result.inserted_id))

        print("Invitation Created:", result.inserted_id)

    print("=====================================\n")

    return {
        "success": True,
        "message": "Invitations sent successfully.",
        "invitation_ids": invitation_ids
    }


# ==========================================
# GET PENDING INVITATIONS
# ==========================================

async def pending_invitations_service(user_id: str):

    print("\n========== PENDING INVITATIONS ==========")
    print("User:", user_id)

    invitations = []

    cursor = invitations_collection.find({
        "invited_user_id": user_id,
        "status": "pending"
    })

    async for invite in cursor:

        host = await users_collection.find_one({
            "_id": ObjectId(invite["host_id"])
        })

        invitations.append({
            "invitation_id": str(invite["_id"]),
            "meeting_id": invite["meeting_id"],
            "host_id": invite["host_id"],
            "host_name": host.get("full_name") if host else "",
            "host_email": host.get("email") if host else "",
            "status": invite["status"],
            "created_at": invite["created_at"]
        })

    print("Pending Invitations:", len(invitations))
    print("========================================\n")

    return {
        "success": True,
        "data": invitations
    }


# ==========================================
# ACCEPT INVITATION
# ==========================================

async def accept_invitation_service(invitation_id: str):

    print("\n========== ACCEPT INVITATION ==========")
    print("Invitation:", invitation_id)

    invite = await invitations_collection.find_one({
        "_id": ObjectId(invitation_id)
    })

    if not invite:
        return {
            "success": False,
            "message": "Invitation not found."
        }

    await meetings_collection.update_one(
        {
            "_id": ObjectId(invite["meeting_id"])
        },
        {
            "$addToSet": {
                "participants": invite["invited_user_id"]
            }
        }
    )

    await invitations_collection.update_one(
        {
            "_id": ObjectId(invitation_id)
        },
        {
            "$set": {
                "status": "accepted"
            }
        }
    )

    print("Invitation Accepted")
    print("=======================================\n")

    return {
        "success": True,
        "message": "Invitation accepted."
    }


# ==========================================
# REJECT INVITATION
# ==========================================

async def reject_invitation_service(invitation_id: str):

    print("\n========== REJECT INVITATION ==========")
    print("Invitation:", invitation_id)

    await invitations_collection.update_one(
        {
            "_id": ObjectId(invitation_id)
        },
        {
            "$set": {
                "status": "rejected"
            }
        }
    )

    print("Invitation Rejected")
    print("=======================================\n")

    return {
        "success": True,
        "message": "Invitation rejected."
    }