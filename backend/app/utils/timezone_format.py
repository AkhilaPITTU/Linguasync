"""Single, shared place for converting stored UTC timestamps into Indian
Standard Time (Asia/Kolkata, UTC+05:30) for display.

Nothing here ever writes to the database, changes what gets stored, or
changes how a timestamp is compared/sorted -- every value handed to these
helpers is left completely untouched wherever it actually lives (a Mongo
document, a websocket payload, an in-memory entry dict). Only the
*string* returned here, for showing a user something or drawing text into
a PDF page, is ever in IST.

A fixed UTC+05:30 offset is used rather than the IANA "Asia/Kolkata"
zoneinfo entry so this has no dependency on a system tzdata package being
present (not every dev machine/CI image ships one, e.g. plain Windows
Python) -- India has observed a single, non-DST offset since 1945, so a
fixed offset is exact, not an approximation.
"""

from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def to_ist(value):
    """Best-effort conversion of a stored UTC timestamp to IST.

    Accepts a timezone-aware or naive ``datetime`` (naive values are
    assumed to already be UTC, matching every writer in this codebase) or
    an ISO 8601 string. Returns ``None`` when ``value`` is empty or is not
    something that can be interpreted as a point in time (for example a
    legacy, already human-rendered string) so callers can fall back to
    their previous behaviour instead of raising.
    """

    if not value:
        return None

    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    if not isinstance(value, datetime):
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return value.astimezone(IST)


def format_ist(value, fallback: str = "-") -> str:
    """Render ``value`` as e.g. ``12 Sep 2026, 4:35 PM IST``.

    Returns ``fallback`` for empty/None input. For a value that could not
    be parsed as a timestamp, returns the original string unchanged
    (never raises, never silently drops data the caller already had).
    """

    if not value:
        return fallback

    ist_dt = to_ist(value)
    if ist_dt is None:
        return value if isinstance(value, str) else fallback

    day = ist_dt.strftime("%d %b %Y")
    hour_12 = ist_dt.strftime("%I").lstrip("0") or "12"
    minute = ist_dt.strftime("%M")
    am_pm = ist_dt.strftime("%p")
    return f"{day}, {hour_12}:{minute} {am_pm} IST"
