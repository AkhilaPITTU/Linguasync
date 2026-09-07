from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from xml.sax.saxutils import escape

from bson import ObjectId
from app.ai.translation_service import translation_service
from app.config.database import (
    meetings_collection,
    transcripts_collection,
    translations_collection,
    users_collection,
)
from app.config.settings import settings


class ConversationExportError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _clean_text(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def _safe_filename_part(value: str) -> str:
    return "".join(character if character.isalnum() or character in "-_" else "_" for character in value)


def _register_unicode_font() -> str:
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
    except ImportError as error:
        raise ConversationExportError(
            500,
            "PDF export is not installed on this server. Please contact the administrator.",
        ) from error

    font_path = Path(settings.PDF_UNICODE_FONT_PATH)
    if not font_path.is_file():
        raise ConversationExportError(500, "A Unicode PDF font is not configured on this server.")

    font_name = "LinguasyncUnicode"
    if font_name not in pdfmetrics.getRegisteredFontNames():
        try:
            pdfmetrics.registerFont(TTFont(font_name, str(font_path), subfontIndex=0))
        except Exception as error:
            raise ConversationExportError(500, "The configured Unicode PDF font could not be loaded.") from error
    return font_name


async def export_conversation_pdf(meeting_id: str, requester_id: str):
    """Build one private, requester-language PDF from persisted meeting transcripts."""
    stage = "meeting_lookup"
    print(f"[conversation-export] started meeting_id={meeting_id}")
    meeting = await meetings_collection.find_one({"meeting_id": meeting_id})
    if not meeting:
        raise ConversationExportError(404, "Meeting not found.")

    participant = next((item for item in meeting.get("participants", []) if str(item.get("user_id", "")) == str(requester_id)), None)
    if not participant:
        raise ConversationExportError(403, "You are not a participant of this meeting.")

    preferred_language = _clean_text(participant.get("preferred_language") or participant.get("language"))
    if not preferred_language:
        raise ConversationExportError(422, "Your preferred language is not available for this meeting.")
    print(
        f"[conversation-export] meeting_id={meeting_id} "
        f"preferred_language={preferred_language}"
    )

    try:
        requester = await users_collection.find_one({"_id": ObjectId(requester_id)}, {"full_name": 1})
    except Exception:
        requester = None
    requester_name = _clean_text((requester or {}).get("full_name")) or _clean_text(participant.get("user_name")) or "Participant"

    stage = "conversation_lookup"
    transcript_count = await transcripts_collection.count_documents({"meeting_id": meeting_id})
    print(
        f"[conversation-export] meeting_id={meeting_id} "
        f"conversation_records={transcript_count}"
    )

    cursor = transcripts_collection.find({"meeting_id": meeting_id}).sort("created_at", 1)
    conversation = []
    seen_records = set()
    async for record in cursor:
        record_key = str(record.get("chunk_id") or record.get("_id") or "")
        if record_key and record_key in seen_records:
            continue
        if record_key:
            seen_records.add(record_key)

        text = _clean_text(record.get("text") or record.get("corrected_text") or record.get("original_text"))
        if not text:
            continue
        source_language = _clean_text(record.get("source_language") or record.get("language")) or "en"

        stored_translation = None
        chunk_id = record.get("chunk_id")
        if chunk_id:
            stored_translation = await translations_collection.find_one({
                "meeting_id": meeting_id,
                "chunk_id": chunk_id,
                "target_language": preferred_language,
                "$or": [
                    {"recipient_id": str(requester_id)},
                    {"user_id": str(requester_id)},
                ],
            })

        translated_text = _clean_text((stored_translation or {}).get("translated_text") or (stored_translation or {}).get("text"))
        if not translated_text:
            stage = "translation"
            try:
                translation = await asyncio.to_thread(
                    translation_service.translate,
                    text,
                    source_lang=source_language,
                    target_lang=preferred_language,
                )
                if translation.get("success"):
                    translated_text = _clean_text(translation.get("translated_text"))
                if not translated_text:
                    print(
                        f"[conversation-export] translation_fallback "
                        f"meeting_id={meeting_id} reason={translation.get('reason', 'empty_result')}"
                    )
            except Exception as error:
                print(
                    f"[conversation-export] translation_fallback "
                    f"meeting_id={meeting_id} error={type(error).__name__}"
                )

        # One unavailable translation must not prevent a user from exporting
        # the complete persisted conversation. The saved original transcript
        # is always safer than omitting the entry or returning a JSON error.
        if not translated_text:
            translated_text = text
        conversation.append({"speaker_name": _clean_text(record.get("speaker_name")) or "Participant", "text": translated_text})

    if not conversation:
        raise ConversationExportError(404, "No conversation is available to export.")

    stage = "pdf_generation"
    print(f"[conversation-export] translation_completed meeting_id={meeting_id}")
    print(f"[conversation-export] pdf_generation_started meeting_id={meeting_id}")
    try:
        pdf_bytes = _build_pdf(meeting_id, requester_name, preferred_language, conversation)
    except ConversationExportError:
        raise
    except Exception as error:
        print(
            f"[conversation-export] failed stage={stage} "
            f"error={type(error).__name__}"
        )
        raise ConversationExportError(500, "The conversation PDF could not be generated.") from error
    print(f"[conversation-export] pdf_generation_completed meeting_id={meeting_id}")
    filename = f"LINGUASYNC_Meeting_{_safe_filename_part(meeting_id)}_{_safe_filename_part(preferred_language)}.pdf"
    return pdf_bytes, filename


def _build_pdf(meeting_id: str, requester_name: str, preferred_language: str, conversation: list[dict]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

    font_name = _register_unicode_font()
    output = BytesIO()
    document = SimpleDocTemplate(output, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm, title="LINGUASYNC Meeting Conversation", author="LINGUASYNC")
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("LinguaTitle", parent=styles["Title"], fontName=font_name, fontSize=22, leading=28, textColor=colors.HexColor("#25205c"), alignment=TA_LEFT)
    meta_style = ParagraphStyle("LinguaMeta", parent=styles["Normal"], fontName=font_name, fontSize=10.5, leading=16, textColor=colors.HexColor("#334155"))
    speaker_style = ParagraphStyle("LinguaSpeaker", parent=styles["Normal"], fontName=font_name, fontSize=11, leading=16, textColor=colors.HexColor("#1e293b"), spaceBefore=9)
    text_style = ParagraphStyle("LinguaText", parent=styles["Normal"], fontName=font_name, fontSize=11, leading=18, textColor=colors.HexColor("#0f172a"), leftIndent=8)
    now = datetime.now(timezone.utc).astimezone().strftime("%d %b %Y, %I:%M %p")
    story = [Paragraph("LINGUASYNC", title_style), Paragraph("Meeting Conversation", meta_style), Spacer(1, 7 * mm), Paragraph(f"<b>Exported for:</b> {escape(requester_name)}", meta_style), Paragraph(f"<b>Language:</b> {escape(preferred_language)}", meta_style), Paragraph(f"<b>Meeting:</b> {escape(meeting_id)}", meta_style), Paragraph(f"<b>Date:</b> {now}", meta_style), Spacer(1, 5 * mm), HRFlowable(width="100%", thickness=0.7, color=colors.HexColor("#cbd5e1")), Spacer(1, 3 * mm)]
    for entry in conversation:
        story.extend([Paragraph(f"<b>{escape(entry['speaker_name'])}:</b>", speaker_style), Paragraph(escape(entry["text"]), text_style)])
    document.build(story)
    return output.getvalue()


def content_disposition(filename: str) -> str:
    return f"attachment; filename*=UTF-8''{quote(filename)}"
