from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId

from app.config.database import (
    invitations_collection,
    users_collection,
    meetings_collection,
)


# ==========================================
# GET ALL USERS
# ==========================================


async def get_users_service(current_user_id: str):
  print("\n========== GET USERS API CALLED ==========")
  print("Current User ID:", current_user_id)

  users = []

  try:
    try:
      query_id = ObjectId(current_user_id)
    except InvalidId:
      return {
          "success": False,
          "message": "Invalid current_user_id format.",
          "users": [],
      }

    cursor = users_collection.find({"_id": {"$ne": query_id}})

    async for user in cursor:
      print("User Found:", user)

      users.append({
          "user_id": str(user["_id"]),
          "full_name": user.get("full_name", ""),
          "email": user.get("email", ""),
      })

    print("Total Users Returned:", len(users))
    print("=========================================\n")

    return {"success": True, "users": users}

  except Exception as e:
    print("\nERROR IN GET USERS SERVICE:", str(e))
    print("=========================================\n")

    return {"success": False, "message": str(e), "users": []}


# ==========================================
# SEND INVITATION
# ==========================================


async def send_invitation_service(data, host_id: str):
  print("\n========== SEND INVITATION ==========")
  print("Host:", host_id)
  print("Meeting:", data.meeting_id)
  print("Participants:", data.participants)

  invitation_ids = []

  try:
    for participant in data.participants:
      existing = await invitations_collection.find_one({
          "meeting_id": data.meeting_id,
          "invited_user_id": participant,
          "status": "pending",
      })

      if existing:
        print("Invitation already exists:", participant)
        continue

      invitation = {
          "meeting_id": data.meeting_id,
          "host_id": host_id,
          "invited_user_id": participant,
          "status": "pending",
          "created_at": datetime.utcnow(),
      }

      result = await invitations_collection.insert_one(invitation)
      invitation_ids.append(str(result.inserted_id))

      print("Invitation Created:", result.inserted_id)

    print("=====================================\n")

    return {
        "success": True,
        "message": "Invitations sent successfully.",
        "invitation_ids": invitation_ids,
    }

  except Exception as e:
    print("\nERROR IN SEND INVITATION SERVICE:", str(e))
    return {"success": False, "message": str(e), "invitation_ids": []}


# ==========================================
# GET PENDING INVITATIONS
# ==========================================


async def pending_invitations_service(user_id: str):
  print("\n========== PENDING INVITATIONS ==========")
  print("User:", user_id)

  invitations = []

  try:
    cursor = invitations_collection.find(
        {"invited_user_id": user_id, "status": "pending"}
    )

    async for invite in cursor:
      host = None
      if "host_id" in invite and invite["host_id"]:
        try:
          host = await users_collection.find_one(
              {"_id": ObjectId(invite["host_id"])}
          )
        except InvalidId:
          pass

      meeting = await meetings_collection.find_one(
          {"meeting_id": invite.get("meeting_id")}
      )

      invitations.append({
          "invitation_id": str(invite["_id"]),
          "meeting_id": invite.get("meeting_id", ""),
          "host_id": invite.get("host_id", ""),
          "host_name": host.get("full_name", "") if host else "",
          "host_email": host.get("email", "") if host else "",
          "meeting_type": (
              meeting.get("meeting_type") if meeting else "video"
          ),
          "preferred_language": (
              meeting.get("preferred_language") if meeting else "English"
          ),
          "output_mode": (
              meeting.get("output_mode") if meeting else "original"
          ),
          "status": invite.get("status", "pending"),
          "created_at": invite.get("created_at"),
      })

    print("Pending Invitations:", len(invitations))
    print("========================================\n")

    return {"success": True, "data": invitations}

  except Exception as e:
    print("\nERROR IN PENDING INVITATIONS SERVICE:", str(e))
    return {"success": False, "message": str(e), "data": []}


# ==========================================
# ACCEPT INVITATION
# ==========================================


async def accept_invitation_service(invitation_id: str):
  print("\n========== ACCEPT INVITATION ==========")
  print("Invitation:", invitation_id)

  try:
    try:
      obj_id = ObjectId(invitation_id)
    except InvalidId:
      return {"success": False, "message": "Invalid invitation ID format."}

    invite = await invitations_collection.find_one({"_id": obj_id})

    if not invite:
      return {"success": False, "message": "Invitation not found."}

    invited_user_id = invite.get("invited_user_id")

    # Fetch user safely with ObjectId conversion check
    host_user = None
    if invited_user_id:
      try:
        host_user = await users_collection.find_one(
            {"_id": ObjectId(invited_user_id)}
        )
      except InvalidId:
        pass

    participant = {
        "user_id": invited_user_id,
        "user_name": host_user.get("full_name", "") if host_user else "",
        "language": "English",
        "mic_enabled": True,
        "camera_enabled": True,
        "screen_share": False,
        "speaking": False,
    }

    await meetings_collection.update_one(
        {"meeting_id": invite.get("meeting_id")},
        {"$addToSet": {"participants": participant}},
    )

    await invitations_collection.update_one(
        {"_id": obj_id}, {"$set": {"status": "accepted"}}
    )

    print("Invitation Accepted successfully")
    print("=======================================\n")

    return {
        "success": True,
        "message": "Invitation accepted.",
        "meeting_id": invite.get("meeting_id"),
    }

  except Exception as e:
    print("\nERROR IN ACCEPT INVITATION SERVICE:", str(e))
    return {"success": False, "message": str(e)}


# ==========================================
# REJECT INVITATION
# ==========================================


async def reject_invitation_service(invitation_id: str):
  print("\n========== REJECT INVITATION ==========")
  print("Invitation:", invitation_id)

  try:
    try:
      obj_id = ObjectId(invitation_id)
    except InvalidId:
      return {"success": False, "message": "Invalid invitation ID format."}

    # Fetch the invitation record first so we can extract meeting_id safely
    invite = await invitations_collection.find_one({"_id": obj_id})

    if not invite:
      return {"success": False, "message": "Invitation not found."}

    await invitations_collection.update_one(
        {"_id": obj_id}, {"$set": {"status": "rejected"}}
    )

    print("Invitation Rejected")
    print("=======================================\n")

    return {
        "success": True,
        "message": "Invitation rejected.",
        "meeting_id": invite.get("meeting_id"),
    }

  except Exception as e:
    print("\nERROR IN REJECT INVITATION SERVICE:", str(e))
    return {"success": False, "message": str(e)}