from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from app.config.database import (
    invitations_collection,
    meetings_collection,
    users_collection,
)
from app.utils.timezone_format import to_ist


async def _lookup_user_name(user_id):
    """Look up a user's current display name by their real Mongo _id.

    Returns ``None`` (never a guess) when the id is missing/invalid or the
    user no longer exists -- callers decide their own fallback text. This
    mirrors the live host-name lookup this service already did before this
    change; it is now reused for every party on a call, not just the host.
    """
    if not user_id:
        return None
    try:
        user = await users_collection.find_one({"_id": ObjectId(str(user_id))})
    except (InvalidId, TypeError):
        return None
    if not user:
        return None
    return user.get("full_name")


def _split_ist_date_time(value):
    """Same UTC -> IST conversion and display formatting as the shared
    ``app.utils.timezone_format.format_ist`` helper (kept untouched here,
    since other features depend on it) -- just returned as separate date
    and time strings instead of one combined string, to match the
    Call History card layout.
    """
    ist_dt = to_ist(value)
    if ist_dt is None:
        return "-", "-"
    date_display = ist_dt.strftime("%d %b %Y")
    hour_12 = ist_dt.strftime("%I").lstrip("0") or "12"
    time_display = f"{hour_12}:{ist_dt.strftime('%M')} {ist_dt.strftime('%p')} IST"
    return date_display, time_display


def _format_duration(started_at, ended_at):
    if started_at and ended_at:
        seconds = int((ended_at - started_at).total_seconds())
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        if hours > 0:
            return f"{hours} hr {minutes} min"
        if minutes > 0:
            return f"{minutes} min {secs}s" if secs else f"{minutes} min"
        return f"{secs}s"
    return None


async def recent_calls_service(user_id: str):

    normalized_user_id = str(user_id)

    # 1) Every meeting this user hosted or actually joined -- the original
    #    query this service already used.
    meetings = await meetings_collection.find(
        {
            "$or": [
                {"host_id": normalized_user_id},
                {"participants.user_id": normalized_user_id},
            ]
        }
    ).to_list(length=None)

    # 2) Meetings this user was invited to but never joined. A rejected or
    #    ignored (missed) invitation never adds the invitee to
    #    `participants`, so query 1) alone would silently drop those calls
    #    from their own call history -- this is an additive read of the
    #    same invitations_collection the invitation feature already
    #    writes to; nothing about invitations is created or changed here.
    own_invites = await invitations_collection.find(
        {"invited_user_id": normalized_user_id}
    ).to_list(length=None)
    invited_meeting_ids = {
        str(invite.get("meeting_id"))
        for invite in own_invites
        if invite.get("meeting_id")
    }
    known_meeting_ids = {str(meeting.get("meeting_id")) for meeting in meetings}
    missing_ids = list(invited_meeting_ids - known_meeting_ids)
    if missing_ids:
        meetings += await meetings_collection.find(
            {"meeting_id": {"$in": missing_ids}}
        ).to_list(length=None)

    meetings.sort(
        key=lambda m: m.get("started_at") or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    # All invitation records for these specific meetings, so each call's
    # caller/receiver direction and status can be read from real,
    # already-stored invitation outcomes instead of inferred.
    meeting_ids = [meeting.get("meeting_id") for meeting in meetings]
    invitation_records = (
        await invitations_collection.find(
            {"meeting_id": {"$in": meeting_ids}}
        ).to_list(length=None)
        if meeting_ids
        else []
    )
    invitations_by_meeting = {}
    for invite in invitation_records:
        invitations_by_meeting.setdefault(str(invite.get("meeting_id")), []).append(invite)

    recent_calls = []

    for meeting in meetings:

        meeting_id = str(meeting.get("meeting_id"))
        host_id = str(meeting.get("host_id") or "")
        is_outgoing = normalized_user_id == host_id

        host_name = await _lookup_user_name(host_id) or "Unknown"

        participants = meeting.get("participants", [])
        participant_ids = {str(p.get("user_id")) for p in participants}
        meeting_invites = invitations_by_meeting.get(meeting_id, [])

        if is_outgoing:
            # Who this call was placed to: real party ids drawn from two
            # stored sources -- everyone who actually joined (minus the
            # host) and anyone invited who has not (yet) joined.
            other_ids = {pid for pid in participant_ids if pid and pid != host_id}
            other_ids |= {
                str(invite.get("invited_user_id"))
                for invite in meeting_invites
                if invite.get("invited_user_id")
            }

            other_names = [
                (await _lookup_user_name(other_id)) or "Unknown"
                for other_id in other_ids
            ]
            caller_name = host_name
            receiver_name = ", ".join(sorted(other_names)) if other_names else "-"

            joined_other = bool(other_ids & (participant_ids - {host_id}))
            relevant_invites = [
                invite for invite in meeting_invites
                if str(invite.get("invited_user_id")) in other_ids
            ]
        else:
            # The viewer is the invited/other party -- the call was placed
            # to them by the host, so their own real name is the receiver.
            caller_name = host_name
            receiver_name = await _lookup_user_name(normalized_user_id) or "Unknown"
            joined_other = normalized_user_id in participant_ids
            relevant_invites = [
                invite for invite in meeting_invites
                if str(invite.get("invited_user_id")) == normalized_user_id
            ]

        meeting_status = meeting.get("status")

        if meeting_status == "active":
            call_status = "Ongoing"
        elif meeting_status == "cancelled":
            call_status = "Cancelled"
        elif joined_other:
            call_status = "Completed"
        elif any(invite.get("status") == "rejected" for invite in relevant_invites):
            call_status = "Rejected"
        elif meeting_status == "completed":
            # The meeting ran its course but this side never joined and
            # never explicitly rejected either -- a real, stored absence
            # of participation, not an invented state.
            call_status = "Missed"
        else:
            call_status = "-"

        meeting_type = meeting.get("meeting_type", "video")
        mode = "Video" if meeting_type.lower() == "video" else "Audio"

        started_at = meeting.get("started_at")
        ended_at = meeting.get("ended_at")

        duration = _format_duration(started_at, ended_at)
        if duration is None:
            duration = "00:00" if call_status in ("Missed", "Rejected") else "Ongoing"

        date_display, time_display = _split_ist_date_time(started_at)

        recent_calls.append({

            "id": meeting.get("meeting_id"),

            "caller": caller_name,

            "receiver": receiver_name,

            "direction": "Outgoing" if is_outgoing else "Incoming",

            "mode": mode,

            "status": call_status,

            "duration": duration,

            "date": date_display,

            "time": time_display,

        })

    return {

        "success": True,

        "data": recent_calls

    }
