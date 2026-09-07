"""Build an authorized, per-meeting chat export without altering chat delivery."""

from datetime import datetime, timezone
from urllib.parse import quote

from app.config.database import chat_messages_collection, meetings_collection


class ChatExportError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _is_participant(meeting: dict, user_id: str) -> bool:
    return any(
        str(participant.get("user_id", "")) == str(user_id)
        for participant in meeting.get("participants", [])
    )


def _recipient_delivery(document: dict, recipient_id: str) -> dict:
    return next(
        (
            delivery
            for delivery in document.get("deliveries", [])
            if str(delivery.get("recipient_id", "")) == str(recipient_id)
        ),
        {},
    )


async def export_chat_json(meeting_id: str, requester_id: str) -> dict:
    """Return only the requester's authorized view of one meeting's chats."""
    meeting = await meetings_collection.find_one(
        {"meeting_id": meeting_id}, {"_id": 0, "participants": 1}
    )
    if not meeting:
        raise ChatExportError(404, "Meeting not found.")
    if not _is_participant(meeting, requester_id):
        raise ChatExportError(403, "You are not a participant of this meeting.")

    documents = await chat_messages_collection.find(
        {"meeting_id": meeting_id}
    ).sort([("created_at", 1), ("_id", 1)]).to_list(length=None)

    messages = []
    for document in documents:
        delivery = _recipient_delivery(document, requester_id)
        original_text = document.get("original_text") or document.get("text") or ""
        delivered_text = delivery.get("text") or original_text
        messages.append({
            "message_id": str(document.get("message_id") or document.get("_id")),
            "sender_id": str(document.get("sender_id", "")),
            "sender_name": document.get("sender_name") or document.get("user_name") or "Participant",
            "timestamp": document.get("timestamp") or document.get("created_at"),
            "text": delivered_text,
            "original_text": original_text,
            "is_translated": bool(delivery.get("is_translated")),
        })

    if not messages:
        raise ChatExportError(404, "No chat messages are available to export.")

    print(
        f"[chat-export] succeeded meeting_id={meeting_id} requester_id={requester_id} "
        f"message_count={len(messages)}"
    )
    return {
        "meeting_id": meeting_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "messages": messages,
    }


def chat_export_filename(meeting_id: str) -> str:
    safe_meeting_id = "".join(
        character if character.isalnum() or character in "-_" else "_"
        for character in meeting_id
    )
    return f"LINGUASYNC_Chat_{safe_meeting_id or 'meeting'}.json"


def chat_content_disposition(filename: str) -> str:
    return f"attachment; filename*=UTF-8''{quote(filename)}"
