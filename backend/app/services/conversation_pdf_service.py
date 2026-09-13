"""Renders one participant's own conversation history into PDF bytes.

This module owns layout/typography only -- it has no idea what a JWT or a
MongoDB collection is, and no cryptography dependency. Signing happens
afterwards in ``pdf_signature_service``. Keeping the two separate means a
rendering change can never accidentally weaken (or bypass) the signature,
and vice versa.
"""

import os
from datetime import datetime
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

try:
    import arabic_reshaper
    from bidi.algorithm import get_display as _bidi_display

    _ARABIC_SHAPING_AVAILABLE = True
except Exception:  # noqa: BLE001 - optional dependency, degrade gracefully
    _ARABIC_SHAPING_AVAILABLE = False

from app.utils.timezone_format import format_ist

FONT_ASSET_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")
)

# One embedded TrueType font family per Indic script LinguaSync supports,
# plus Latin for English. Files live in app/assets/fonts (Noto Sans, SIL/
# Google-licensed, redistributable) and are registered with reportlab once
# per process.
_FONT_FILES = {
    "NotoSans": "NotoSans-Regular.ttf",
    "NotoSans-Bold": "NotoSans-Bold.ttf",
    "NotoSansDevanagari": "NotoSansDevanagari-Regular.ttf",
    "NotoSansDevanagari-Bold": "NotoSansDevanagari-Bold.ttf",
    "NotoSansTelugu": "NotoSansTelugu-Regular.ttf",
    "NotoSansTelugu-Bold": "NotoSansTelugu-Bold.ttf",
    "NotoSansTamil": "NotoSansTamil-Regular.ttf",
    "NotoSansTamil-Bold": "NotoSansTamil-Bold.ttf",
    "NotoSansKannada": "NotoSansKannada-Regular.ttf",
    "NotoSansKannada-Bold": "NotoSansKannada-Bold.ttf",
    "NotoSansBengali": "NotoSansBengali-Regular.ttf",
    "NotoSansBengali-Bold": "NotoSansBengali-Bold.ttf",
    "NotoSansGujarati": "NotoSansGujarati-Regular.ttf",
    "NotoSansGujarati-Bold": "NotoSansGujarati-Bold.ttf",
    "NotoSansGurmukhi": "NotoSansGurmukhi-Regular.ttf",
    "NotoSansGurmukhi-Bold": "NotoSansGurmukhi-Bold.ttf",
    "NotoNaskhArabic": "NotoNaskhArabic-Regular.ttf",
    "NotoNaskhArabic-Bold": "NotoNaskhArabic-Bold.ttf",
}

# LinguaSync's supported meeting languages (app/ai/language_config.py),
# mapped to the embedded font family that covers their script, and whether
# the script is right-to-left (Urdu/Arabic).
_LANGUAGE_FONTS = {
    "english": ("NotoSans", "NotoSans-Bold", False),
    "en": ("NotoSans", "NotoSans-Bold", False),
    "hindi": ("NotoSansDevanagari", "NotoSansDevanagari-Bold", False),
    "hi": ("NotoSansDevanagari", "NotoSansDevanagari-Bold", False),
    "marathi": ("NotoSansDevanagari", "NotoSansDevanagari-Bold", False),
    "mr": ("NotoSansDevanagari", "NotoSansDevanagari-Bold", False),
    "nepali": ("NotoSansDevanagari", "NotoSansDevanagari-Bold", False),
    "ne": ("NotoSansDevanagari", "NotoSansDevanagari-Bold", False),
    "telugu": ("NotoSansTelugu", "NotoSansTelugu-Bold", False),
    "te": ("NotoSansTelugu", "NotoSansTelugu-Bold", False),
    "tamil": ("NotoSansTamil", "NotoSansTamil-Bold", False),
    "ta": ("NotoSansTamil", "NotoSansTamil-Bold", False),
    "kannada": ("NotoSansKannada", "NotoSansKannada-Bold", False),
    "kn": ("NotoSansKannada", "NotoSansKannada-Bold", False),
    "bengali": ("NotoSansBengali", "NotoSansBengali-Bold", False),
    "bn": ("NotoSansBengali", "NotoSansBengali-Bold", False),
    "assamese": ("NotoSansBengali", "NotoSansBengali-Bold", False),
    "as": ("NotoSansBengali", "NotoSansBengali-Bold", False),
    "gujarati": ("NotoSansGujarati", "NotoSansGujarati-Bold", False),
    "gu": ("NotoSansGujarati", "NotoSansGujarati-Bold", False),
    "punjabi": ("NotoSansGurmukhi", "NotoSansGurmukhi-Bold", False),
    "pa": ("NotoSansGurmukhi", "NotoSansGurmukhi-Bold", False),
    "urdu": ("NotoNaskhArabic", "NotoNaskhArabic-Bold", True),
    "ur": ("NotoNaskhArabic", "NotoNaskhArabic-Bold", True),
}

_fonts_registered = False


def _ensure_fonts_registered() -> None:
    global _fonts_registered
    if _fonts_registered:
        return
    for font_name, filename in _FONT_FILES.items():
        pdfmetrics.registerFont(TTFont(font_name, os.path.join(FONT_ASSET_DIR, filename)))
    _fonts_registered = True


def _resolve_fonts(language: str):
    key = (language or "english").strip().lower()
    return _LANGUAGE_FONTS.get(key, _LANGUAGE_FONTS["english"])


def _shape_for_display(text: str, is_rtl: bool) -> str:
    if not text:
        return ""
    if is_rtl and _ARABIC_SHAPING_AVAILABLE:
        try:
            return _bidi_display(arabic_reshaper.reshape(text))
        except Exception:  # noqa: BLE001 - fall back to unshaped text
            return text
    return text


def build_conversation_pdf(
    *,
    meeting: dict,
    participants: list,
    entries: list,
    viewer: dict,
    language: str,
    document_id: str,
    generated_at: datetime,
) -> bytes:
    """Build a signed-ready PDF for one participant's own conversation.

    ``entries`` must already be in chronological order and each entry a
    dict with ``speaker_name``, ``text`` and ``timestamp`` (see
    ``conversation_export_service._merge_entries``).
    """

    _ensure_fonts_registered()

    # The Noto Sans script fonts (Devanagari, Telugu, Tamil, ...) intentionally
    # carry *no* Latin letters -- only their own script plus shared digits/
    # punctuation. Speaker names, the meeting id, section headings and
    # timestamps are always Latin/English text regardless of which language
    # the conversation itself is in, so all of that "chrome" is always set in
    # the Latin font. Only each conversation line's own message body switches
    # fonts, and it switches per *entry* (not once for the whole document):
    # a viewer's own words stay in whatever language they actually spoke,
    # while everyone else's words are already translated into the viewer's
    # preferred language -- two different scripts can legitimately appear on
    # the same page.
    latin_regular, latin_bold, _ = _resolve_fonts("english")

    styles = {
        "title": ParagraphStyle(
            "LSTitle", fontName=latin_bold, fontSize=18, leading=22,
            textColor=colors.HexColor("#111827"), spaceAfter=6,
        ),
        "meta": ParagraphStyle(
            "LSMeta", fontName=latin_regular, fontSize=9.5, leading=14,
            textColor=colors.HexColor("#4B5563"),
        ),
        "section": ParagraphStyle(
            "LSSection", fontName=latin_bold, fontSize=12.5, leading=16,
            spaceBefore=14, spaceAfter=6, textColor=colors.HexColor("#111827"),
        ),
        "speaker": ParagraphStyle(
            "LSSpeaker", fontName=latin_bold, fontSize=10.5, leading=14,
            textColor=colors.HexColor("#1D4ED8"),
        ),
    }

    _body_style_cache = {}

    def _body_style(entry_language: str) -> ParagraphStyle:
        regular_font, _, is_rtl = _resolve_fonts(entry_language)
        cache_key = (regular_font, is_rtl)
        if cache_key not in _body_style_cache:
            _body_style_cache[cache_key] = ParagraphStyle(
                f"LSBody-{regular_font}", fontName=regular_font, fontSize=10.5,
                leading=15, textColor=colors.HexColor("#111827"),
                alignment=TA_RIGHT if is_rtl else TA_LEFT,
            )
        return _body_style_cache[cache_key]

    story = []
    story.append(Paragraph("LinguaSync Conversation Export", styles["title"]))
    story.append(Paragraph(escape(meeting.get("display_title", "Meeting")), styles["meta"]))
    story.append(Paragraph(f"Meeting ID: {escape(meeting.get('meeting_id', '-'))}", styles["meta"]))

    date_line = f"Date &amp; Time: {escape(meeting.get('started_at_display', '-'))}"
    if meeting.get("ended_at_display"):
        date_line += f" &ndash; {escape(meeting['ended_at_display'])}"
    story.append(Paragraph(date_line, styles["meta"]))

    story.append(
        Paragraph(
            f"Exported for: {escape(viewer.get('user_name', 'Participant'))} "
            f"&mdash; language: {escape(language)}",
            styles["meta"],
        )
    )
    story.append(Paragraph(f"Document ID: {escape(document_id)}", styles["meta"]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Participants", styles["section"]))
    if participants:
        for participant in participants:
            role = " (Host)" if participant.get("is_host") else ""
            story.append(
                Paragraph(
                    f"&bull; {escape(participant.get('user_name', 'Participant'))}{role} "
                    f"&mdash; {escape(participant.get('preferred_language') or '-')}",
                    styles["meta"],
                )
            )
    else:
        story.append(Paragraph("No participant records were found.", styles["meta"]))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#E5E7EB")))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Conversation", styles["section"]))
    if not entries:
        story.append(Paragraph("No conversation was recorded for this meeting.", styles["meta"]))
    else:
        for entry in entries:
            speaker_line = (
                f"{escape(entry.get('speaker_name', 'Participant'))}"
                f"&nbsp;&nbsp;&middot;&nbsp;&nbsp;{escape(entry.get('timestamp_display', '-'))}"
            )
            story.append(Paragraph(speaker_line, styles["speaker"]))

            entry_language = entry.get("language") or language
            _, _, entry_is_rtl = _resolve_fonts(entry_language)
            body_text = _shape_for_display(escape(entry.get("text", "")), entry_is_rtl) or "&mdash;"
            story.append(Paragraph(body_text, _body_style(entry_language)))
            story.append(Spacer(1, 8))

    def _draw_header_footer(canvas_obj, doc_obj):
        canvas_obj.saveState()
        page_width, page_height = A4

        canvas_obj.setStrokeColor(colors.HexColor("#E5E7EB"))
        canvas_obj.line(20 * mm, page_height - 17 * mm, page_width - 20 * mm, page_height - 17 * mm)

        canvas_obj.setFont(latin_bold, 9)
        canvas_obj.setFillColor(colors.HexColor("#1D4ED8"))
        canvas_obj.drawString(20 * mm, page_height - 14 * mm, "Generated by LinguaSync")

        canvas_obj.setFont(latin_regular, 8)
        canvas_obj.setFillColor(colors.HexColor("#6B7280"))
        # Displayed in IST -- see app.utils.timezone_format -- to match
        # every other timestamp in this document; generated_at itself
        # (passed in by conversation_export_service) stays a plain UTC
        # datetime and is unaffected.
        canvas_obj.drawRightString(
            page_width - 20 * mm, page_height - 14 * mm, format_ist(generated_at)
        )

        canvas_obj.line(20 * mm, 15 * mm, page_width - 20 * mm, 15 * mm)
        canvas_obj.drawString(20 * mm, 11 * mm, "This PDF is digitally signed by LinguaSync.")
        canvas_obj.drawRightString(page_width - 20 * mm, 11 * mm, f"Page {doc_obj.page}")
        canvas_obj.restoreState()

    from io import BytesIO

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=24 * mm,
        bottomMargin=20 * mm,
        title=f"LinguaSync Conversation Export - {meeting.get('meeting_id', '')}",
        author="LinguaSync",
        subject=document_id,
        creator="LinguaSync",
    )
    doc.build(story, onFirstPage=_draw_header_footer, onLaterPages=_draw_header_footer)
    return buffer.getvalue()
