"""Orchestrates the "download my conversation as a signed PDF" feature and
its counterpart, verifying a previously exported PDF.

Deliberately reuses the existing, already-authorized meeting history read
path (``app.services.meeting_service.get_meeting_history``) instead of
re-querying the transcript/translation collections directly, so this
feature can never diverge from -- or leak more than -- what a participant
is already allowed to see in the running meeting.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from uuid import uuid4

from app.ai.language_config import language_code
from app.config.database import database, pdf_exports_collection
from app.config.settings import settings
from app.services.conversation_pdf_service import build_conversation_pdf
from app.services.meeting_service import get_meeting_history
from app.services.pdf_signature_service import (
    SIGNATURE_ALGORITHM,
    sign_pdf_bytes,
    verify_pdf_bytes,
)
from app.utils.timezone_format import format_ist

meetings_collection = database["meetings"]

logger = logging.getLogger("linguasync.conversation_export")


def _fmt_dt(value) -> str:
    """Render a stored UTC timestamp for display purposes only, converted
    to Indian Standard Time (IST). This is the single formatting entry
    point every date/time shown by this module goes through -- meeting
    started/ended times and each conversation entry's timestamp -- so the
    UTC -> IST conversion lives in exactly one place. The value passed in
    (and whatever collection it came from) is never modified; only the
    returned display string differs.
    """
    return format_ist(value)


def _sort_key(entry) -> datetime:
    timestamp = entry.get("timestamp")
    if isinstance(timestamp, datetime):
        return timestamp if timestamp.tzinfo else timestamp.replace(tzinfo=timezone.utc)
    return datetime.min.replace(tzinfo=timezone.utc)


def _merge_entries(transcripts, translations, chat_messages, user_id) -> list:
    """Build one chronological, per-viewer conversation from the raw
    transcript/translation/chat records ``get_meeting_history`` returns.

    Each transcript chunk is shown in whichever language it should
    actually appear in *for this viewer*: their own words stay in the
    language they spoke, everyone else's words use the translation
    already generated for this viewer by the live translation pipeline
    (never re-translated here). Chat messages follow the same rule using
    the delivery record ``get_meeting_history`` already resolved.
    """

    normalized_user_id = str(user_id)

    translation_index = {}
    for translation in translations:
        key = (translation.get("chunk_id"), str(translation.get("speaker_id")))
        translation_index[key] = translation

    entries = []

    for record in transcripts:
        speaker_id = str(record.get("speaker_id", ""))
        is_own = speaker_id == normalized_user_id

        if is_own:
            text = record.get("text") or record.get("original_text") or ""
            entry_language = record.get("language") or record.get("source_language") or "English"
        else:
            match = translation_index.get((record.get("chunk_id"), speaker_id))
            if match and (match.get("translated_text") or match.get("text")):
                text = match.get("translated_text") or match.get("text")
                entry_language = match.get("target_language") or "English"
            else:
                # No translation was produced for this chunk (e.g. same
                # source/target language, or the pipeline could not
                # translate it) -- fall back to what was actually said
                # rather than silently dropping the line.
                text = record.get("text") or record.get("original_text") or ""
                entry_language = record.get("language") or record.get("source_language") or "English"

        if not text or not text.strip():
            continue

        entries.append(
            {
                "kind": "speech",
                # Presentation-only personalization: the viewer's own lines
                # are always labelled "You" in the exported PDF, regardless
                # of what name was actually stored on the transcript record
                # (which is left untouched -- see module docstring).
                "speaker_name": "You" if is_own else record.get("speaker_name", "Participant"),
                "language": entry_language,
                "text": text.strip(),
                "timestamp": record.get("created_at"),
            }
        )

    for chat in chat_messages:
        text = chat.get("text") or chat.get("original_text") or ""
        if not text or not text.strip():
            continue

        is_own = str(chat.get("user_id")) == normalized_user_id
        if is_own:
            entry_language = chat.get("source_language") or "English"
        else:
            entry_language = "English" if not chat.get("is_translated") else (
                chat.get("source_language") or "English"
            )

        entries.append(
            {
                "kind": "chat",
                # Same presentation-only "You" substitution as above, applied
                # to the viewer's own chat messages.
                "speaker_name": "You" if is_own else (chat.get("name") or chat.get("user_name") or "Participant"),
                "language": entry_language,
                "text": f"[Chat] {text.strip()}",
                "timestamp": chat.get("time"),
            }
        )

    entries.sort(key=_sort_key)

    for entry in entries:
        entry["timestamp_display"] = _fmt_dt(entry.get("timestamp"))

    return entries


async def export_conversation_pdf(meeting_id: str, user_id: str, language: str | None = None) -> dict:
    """Build, sign, persist and log a PDF of ``user_id``'s own view of
    ``meeting_id``. Returns a plain result dict; never raises for
    expected/authorization failures (the controller maps those to HTTP
    status codes), only for genuinely unexpected errors.
    """

    meeting = await meetings_collection.find_one({"meeting_id": meeting_id})
    if not meeting:
        return {"success": False, "status": 404, "message": "Meeting not found."}

    participants = meeting.get("participants", [])
    viewer_participant = next(
        (p for p in participants if str(p.get("user_id")) == str(user_id)), None
    )
    if viewer_participant is None:
        return {
            "success": False,
            "status": 403,
            "message": "You are not a participant in this meeting.",
        }

    history = await get_meeting_history(meeting_id, user_id)
    if not history.get("success"):
        # get_meeting_history already re-checks participation; surface its
        # message rather than duplicating the authorization logic here.
        return {"success": False, "status": 403, "message": history.get("message", "Access denied.")}

    requested_language = (language or viewer_participant.get("preferred_language") or "English").strip()
    if not language_code(requested_language):
        return {
            "success": False,
            "status": 400,
            "message": f"'{requested_language}' is not a supported LinguaSync language.",
        }

    entries = _merge_entries(
        history.get("transcripts", []),
        history.get("translations", []),
        history.get("chat_messages", []),
        user_id,
    )

    meeting_view = {
        "meeting_id": meeting_id,
        "display_title": f"LinguaSync {meeting.get('meeting_type', 'video').capitalize()} Meeting",
        "started_at_display": _fmt_dt(meeting.get("started_at")),
        "ended_at_display": _fmt_dt(meeting.get("ended_at")) if meeting.get("ended_at") else None,
    }

    participant_views = [
        {
            "user_name": participant.get("user_name", "Participant"),
            "preferred_language": participant.get("preferred_language") or participant.get("language") or "-",
            "is_host": str(participant.get("user_id")) == str(meeting.get("host_id")),
        }
        for participant in participants
    ]

    document_id = str(uuid4())
    generated_at = datetime.now(timezone.utc)

    try:
        # Both calls are synchronous/CPU-bound (reportlab layout, RSA
        # signing) and pyHanko's signer additionally drives its own
        # asyncio.run() internally, which cannot be called from inside the
        # event loop this async function is already running on -- so both
        # run on a worker thread, the same pattern already used for
        # translation_service.translate in the live meeting pipeline.
        pdf_bytes = await asyncio.to_thread(
            build_conversation_pdf,
            meeting=meeting_view,
            participants=participant_views,
            entries=entries,
            viewer={"user_id": str(user_id), "user_name": viewer_participant.get("user_name", "Participant")},
            language=requested_language,
            document_id=document_id,
            generated_at=generated_at,
        )
        signed_bytes = await asyncio.to_thread(
            sign_pdf_bytes,
            pdf_bytes,
            reason=f"LinguaSync conversation export for meeting {meeting_id}",
        )
    except Exception:
        logger.exception(
            "PDF build/sign failed -> meeting_id=%s user_id=%s language=%s",
            meeting_id, user_id, requested_language,
        )
        return {"success": False, "status": 500, "message": "Unable to generate the conversation PDF."}

    export_dir = os.path.join(settings.TRANSCRIPT_EXPORT_FOLDER, "signed")
    file_path = None
    try:
        os.makedirs(export_dir, exist_ok=True)
        file_path = os.path.join(export_dir, f"{document_id}.pdf")
        with open(file_path, "wb") as export_file:
            export_file.write(signed_bytes)
    except OSError:
        # Persisting a copy on disk is an audit convenience, not a
        # prerequisite for the download itself -- never fail the export
        # over a filesystem/permissions issue.
        logger.warning("Could not persist a copy of PDF export %s to disk.", document_id, exc_info=True)
        file_path = None

    record = {
        "user_id": str(user_id),
        "meeting_id": meeting_id,
        "document_id": document_id,
        "language": requested_language,
        "generated_at": generated_at,
        "signature_algorithm": SIGNATURE_ALGORITHM,
        "exported_by": str(user_id),
        "verification_status": "unverified",
        "file_path": file_path,
    }

    try:
        await pdf_exports_collection.insert_one(record)
    except Exception:
        # The export itself already succeeded and the user is waiting for
        # their file; a logging-store failure must not block delivery.
        logger.exception("Could not persist export metadata for document_id=%s", document_id)

    logger.info(
        "PDF export event -> user_id=%s meeting_id=%s document_id=%s language=%s "
        "entries=%s size_bytes=%s",
        user_id, meeting_id, document_id, requested_language, len(entries), len(signed_bytes),
    )

    filename = f"linguasync_conversation_{meeting_id[:8]}_{document_id[:8]}.pdf"
    return {
        "success": True,
        "pdf_bytes": signed_bytes,
        "filename": filename,
        "document_id": document_id,
    }


async def verify_conversation_pdf(file_bytes: bytes, verified_by: str | None) -> dict:
    """Cryptographically verify an uploaded PDF and, best-effort, correlate
    it back to its export-log entry by the Document ID embedded at
    generation time."""

    # verify_pdf_bytes performs its own signature-validation pass through
    # pyHanko, which (like signing) drives its own event loop internally --
    # see the comment in export_conversation_pdf above.
    result = await asyncio.to_thread(verify_pdf_bytes, file_bytes)
    document_id = result.get("document_id")

    record = None
    if document_id:
        try:
            record = await pdf_exports_collection.find_one({"document_id": document_id})
        except Exception:
            logger.exception("Could not look up export record for document_id=%s", document_id)

    if not result.get("signed"):
        verification_status = "unsigned"
    elif result.get("signature_valid"):
        verification_status = "valid"
    elif result.get("document_modified"):
        verification_status = "tampered"
    else:
        verification_status = "invalid"

    if record and document_id:
        try:
            await pdf_exports_collection.update_one(
                {"document_id": document_id},
                {
                    "$set": {
                        "verification_status": verification_status,
                        "last_verified_at": datetime.now(timezone.utc),
                        "last_verified_by": verified_by,
                    }
                },
            )
        except Exception:
            logger.exception("Could not update verification status for document_id=%s", document_id)

    logger.info(
        "PDF verify event -> verified_by=%s document_id=%s status=%s",
        verified_by, document_id, verification_status,
    )

    generated_at = record.get("generated_at") if record else None

    return {
        "success": True,
        "signature_valid": bool(result.get("signature_valid")),
        "document_modified": result.get("document_modified"),
        "signed": bool(result.get("signed")),
        "verification_status": verification_status,
        "document_id": document_id,
        "meeting_id": record.get("meeting_id") if record else None,
        "generated_at": generated_at.isoformat() if isinstance(generated_at, datetime) else generated_at,
        "language": record.get("language") if record else None,
        "signature_algorithm": (record or {}).get("signature_algorithm") or SIGNATURE_ALGORITHM,
        "signer": result.get("signer_common_name"),
        "signing_time": result.get("signing_time"),
        "message": result.get("error"),
    }
