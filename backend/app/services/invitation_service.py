from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId

from app.config.database import (
    invitations_collection,
    users_collection,
    meetings_collection,
)


# =========================================================
# GET ALL USERS
# =========================================================

async def get_users_service(current_user_id: str):

    print("\n========== GET USERS API CALLED ==========")
    print("Current User ID:", current_user_id)

    users = []

    try:

        # -------------------------------------------------
        # Convert current user ID to ObjectId
        # -------------------------------------------------

        try:

            query_id = ObjectId(current_user_id)

        except InvalidId:

            return {
                "success": False,
                "message": "Invalid current_user_id format.",
                "users": []
            }


        # -------------------------------------------------
        # Get all users except current user
        # -------------------------------------------------

        cursor = users_collection.find(
            {
                "_id": {
                    "$ne": query_id
                }
            }
        )


        async for user in cursor:

            print(
                "User Found:",
                user
            )

            users.append({

                "user_id":
                    str(user["_id"]),

                "full_name":
                    user.get(
                        "full_name",
                        ""
                    ),

                "email":
                    user.get(
                        "email",
                        ""
                    )

            })


        print(
            "Total Users Returned:",
            len(users)
        )

        print(
            "=========================================\n"
        )


        return {
            "success": True,
            "users": users
        }


    except Exception as e:

        print(
            "\nERROR IN GET USERS SERVICE:",
            str(e)
        )

        print(
            "=========================================\n"
        )


        return {
            "success": False,
            "message": str(e),
            "users": []
        }


# =========================================================
# SEND INVITATION
# =========================================================

async def send_invitation_service(
    data,
    host_id: str
):

    print(
        "\n========== SEND INVITATION =========="
    )

    print(
        "Host:",
        host_id
    )

    print(
        "Meeting:",
        data.meeting_id
    )

    print(
        "Participants:",
        data.participants
    )


    invitation_ids = []


    try:

        # -------------------------------------------------
        # Create invitation for each selected participant
        # -------------------------------------------------

        for participant in data.participants:

            # ---------------------------------------------
            # Check duplicate pending invitation
            # ---------------------------------------------

            existing = await invitations_collection.find_one(
                {
                    "meeting_id":
                        data.meeting_id,

                    "invited_user_id":
                        participant,

                    "status":
                        "pending"
                }
            )


            if existing:

                print(
                    "Invitation already exists:",
                    participant
                )

                continue


            # ---------------------------------------------
            # Create invitation
            # ---------------------------------------------

            invitation = {

                "meeting_id":
                    data.meeting_id,

                "host_id":
                    host_id,

                "invited_user_id":
                    participant,

                "status":
                    "pending",

                "created_at":
                    datetime.utcnow()

            }


            result = await invitations_collection.insert_one(
                invitation
            )


            invitation_ids.append(
                str(result.inserted_id)
            )


            print(
                "Invitation Created:",
                result.inserted_id
            )


        print(
            "=====================================\n"
        )


        return {

            "success": True,

            "message":
                "Invitations sent successfully.",

            "invitation_ids":
                invitation_ids

        }


    except Exception as e:

        print(
            "\nERROR IN SEND INVITATION SERVICE:",
            str(e)
        )


        return {

            "success": False,

            "message":
                str(e),

            "invitation_ids":
                []

        }


# =========================================================
# GET PENDING INVITATIONS
# =========================================================

async def pending_invitations_service(
    user_id: str
):

    print(
        "\n========== PENDING INVITATIONS =========="
    )

    print(
        "User:",
        user_id
    )


    invitations = []


    try:

        # -------------------------------------------------
        # Find pending invitations for current user
        # -------------------------------------------------

        cursor = invitations_collection.find(
            {
                "invited_user_id":
                    user_id,

                "status":
                    "pending"
            }
        )


        async for invite in cursor:

            host = None


            # ---------------------------------------------
            # Get host information
            # ---------------------------------------------

            if (
                "host_id" in invite
                and invite["host_id"]
            ):

                try:

                    host = await users_collection.find_one(
                        {
                            "_id":
                                ObjectId(
                                    invite["host_id"]
                                )
                        }
                    )

                except InvalidId:

                    pass


            # ---------------------------------------------
            # Get meeting information
            # ---------------------------------------------

            meeting = await meetings_collection.find_one(
                {
                    "meeting_id":
                        invite.get(
                            "meeting_id"
                        )
                }
            )


            # ---------------------------------------------
            # Build invitation response
            # ---------------------------------------------

            invitations.append({

                "invitation_id":
                    str(invite["_id"]),

                "meeting_id":
                    invite.get(
                        "meeting_id",
                        ""
                    ),

                "host_id":
                    invite.get(
                        "host_id",
                        ""
                    ),

                "host_name":
                    host.get(
                        "full_name",
                        ""
                    )
                    if host
                    else "",

                "host_email":
                    host.get(
                        "email",
                        ""
                    )
                    if host
                    else "",

                "meeting_type":
                    meeting.get(
                        "meeting_type"
                    )
                    if meeting
                    else "video",

                "preferred_language":
                    meeting.get(
                        "preferred_language"
                    )
                    if meeting
                    else "English",

                "output_mode":
                    meeting.get(
                        "output_mode"
                    )
                    if meeting
                    else "original",

                "status":
                    invite.get(
                        "status",
                        "pending"
                    ),

                "created_at":
                    invite.get(
                        "created_at"
                    )

            })


        print(
            "Pending Invitations:",
            len(invitations)
        )

        print(
            "========================================\n"
        )


        return {

            "success":
                True,

            "data":
                invitations

        }


    except Exception as e:

        print(
            "\nERROR IN PENDING INVITATIONS SERVICE:",
            str(e)
        )


        return {

            "success":
                False,

            "message":
                str(e),

            "data":
                []

        }


# =========================================================
# ACCEPT INVITATION
# =========================================================

async def accept_invitation_service(
    invitation_id: str
):

    print(
        "\n========== ACCEPT INVITATION =========="
    )

    print(
        "Invitation:",
        invitation_id
    )


    try:

        # -------------------------------------------------
        # Validate invitation ObjectId
        # -------------------------------------------------

        try:

            obj_id = ObjectId(
                invitation_id
            )

        except InvalidId:

            return {

                "success":
                    False,

                "message":
                    "Invalid invitation ID format."

            }


        # -------------------------------------------------
        # Find invitation
        # -------------------------------------------------

        invite = await invitations_collection.find_one(
            {
                "_id":
                    obj_id
            }
        )


        if not invite:

            return {

                "success":
                    False,

                "message":
                    "Invitation not found."

            }


        print(
            "Invitation Found:",
            invite
        )


        # -------------------------------------------------
        # Make sure invitation is still pending
        # -------------------------------------------------

        if invite.get("status") != "pending":

            return {

                "success":
                    False,

                "message":
                    "Invitation is no longer pending."

            }


        # -------------------------------------------------
        # Get meeting ID
        # -------------------------------------------------

        meeting_id = invite.get(
            "meeting_id"
        )


        print(
            "Meeting ID:",
            meeting_id
        )


        if not meeting_id:

            return {

                "success":
                    False,

                "message":
                    "Meeting ID missing from invitation."

            }


        # -------------------------------------------------
        # Verify active meeting exists
        # -------------------------------------------------

        meeting = await meetings_collection.find_one(
            {
                "meeting_id":
                    meeting_id,

                "status":
                    "active"
            }
        )


        print(
            "Meeting Found:",
            meeting
        )


        if not meeting:

            return {

                "success":
                    False,

                "message":
                    "Meeting not found or already ended."

            }


        # -------------------------------------------------
        # Get invited user's ID
        # -------------------------------------------------

        invited_user_id = invite.get(
            "invited_user_id"
        )


        if not invited_user_id:

            return {

                "success":
                    False,

                "message":
                    "Invited user ID missing."

            }


        # -------------------------------------------------
        # Get invited user's real name
        # -------------------------------------------------

        invited_user = None


        try:

            invited_user = await users_collection.find_one(
                {
                    "_id":
                        ObjectId(
                            invited_user_id
                        )
                }
            )

        except InvalidId:

            return {

                "success":
                    False,

                "message":
                    "Invalid invited user ID."

            }


        user_name = (
            invited_user.get(
                "full_name",
                ""
            )
            if invited_user
            else ""
        )


        print(
            "Invited User ID:",
            invited_user_id
        )

        print(
            "Invited User Name:",
            user_name
        )


        # -------------------------------------------------
        # Participant object
        # -------------------------------------------------

        participant = {

            "user_id":
                invited_user_id,

            "user_name":
                user_name,

            "language":
                "English",

            "mic_enabled":
                True,

            "camera_enabled":
                True,

            "screen_share":
                False,

            "speaking":
                False

        }


        # -------------------------------------------------
        # Add participant only if not already present
        # -------------------------------------------------

        result = await meetings_collection.update_one(

            {
                "meeting_id":
                    meeting_id,

                "participants.user_id":
                    {
                        "$ne":
                            invited_user_id
                    }
            },

            {
                "$push":
                    {
                        "participants":
                            participant
                    }
            }

        )


        print(
            "Participant Added:",
            result.modified_count
        )


        # -------------------------------------------------
        # Mark invitation as accepted
        # -------------------------------------------------

        await invitations_collection.update_one(

            {
                "_id":
                    obj_id
            },

            {
                "$set":
                    {
                        "status":
                            "accepted"
                    }
            }

        )


        print(
            "Invitation Accepted"
        )

        print(
            "Meeting ID Returned:",
            meeting_id
        )

        print(
            "=======================================\n"
        )


        # -------------------------------------------------
        # IMPORTANT:
        # Return meeting_id
        # -------------------------------------------------

        return {

            "success":
                True,

            "message":
                "Invitation accepted.",

            "meeting_id":
                meeting_id

        }


    except Exception as e:

        print(
            "\nERROR IN ACCEPT INVITATION SERVICE:",
            str(e)
        )

        print(
            "=======================================\n"
        )


        return {

            "success":
                False,

            "message":
                str(e)

        }


# =========================================================
# REJECT INVITATION
# =========================================================

async def reject_invitation_service(
    invitation_id: str
):

    print(
        "\n========== REJECT INVITATION =========="
    )

    print(
        "Invitation:",
        invitation_id
    )


    try:

        # -------------------------------------------------
        # Validate invitation ID
        # -------------------------------------------------

        try:

            obj_id = ObjectId(
                invitation_id
            )

        except InvalidId:

            return {

                "success":
                    False,

                "message":
                    "Invalid invitation ID format."

            }


        # -------------------------------------------------
        # Find invitation
        # -------------------------------------------------

        invite = await invitations_collection.find_one(
            {
                "_id":
                    obj_id
            }
        )


        if not invite:

            return {

                "success":
                    False,

                "message":
                    "Invitation not found."

            }


        # -------------------------------------------------
        # Reject invitation
        # -------------------------------------------------

        await invitations_collection.update_one(

            {
                "_id":
                    obj_id
            },

            {
                "$set":
                    {
                        "status":
                            "rejected"
                    }
            }

        )


        print(
            "Invitation Rejected"
        )

        print(
            "=======================================\n"
        )


        return {

            "success":
                True,

            "message":
                "Invitation rejected.",

            "meeting_id":
                invite.get(
                    "meeting_id"
                )

        }


    except Exception as e:

        print(
            "\nERROR IN REJECT INVITATION SERVICE:",
            str(e)
        )


        return {

            "success":
                False,

            "message":
                str(e)

        }