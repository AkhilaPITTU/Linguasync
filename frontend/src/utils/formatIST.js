// Shared presentation-layer helper: converts a stored UTC timestamp
// (a Date, an ISO 8601 string, or epoch milliseconds) into an Indian
// Standard Time (Asia/Kolkata, UTC+05:30) display string.
//
// This never changes what is stored or sent anywhere -- it only builds a
// string for something already on screen. Month/AM-PM text is built by
// hand (rather than trusting Intl's locale-formatted month/period
// strings) so the exact "Sep"/"AM"/"PM" wording used here matches the
// backend's IST formatting (see backend/app/utils/timezone_format.py)
// regardless of which browser or Node/ICU version renders the page.

const IST_TIME_ZONE = "Asia/Kolkata";
const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toDate(value) {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getISTParts(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: IST_TIME_ZONE,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).formatToParts(date);

    const get = (type) => parts.find((part) => part.type === type)?.value;

    return {
        year: get("year"),
        month: Number(get("month")),
        day: Number(get("day")),
        // Guard against the well-known Intl quirk where midnight can come
        // back as hour "24" instead of "00" in some engines.
        hour: Number(get("hour")) % 24,
        minute: get("minute"),
    };
}

function formatTimePortion({ hour, minute }) {
    const hour12 = hour % 12 || 12;
    const amPm = hour < 12 ? "AM" : "PM";
    return `${hour12}:${minute} ${amPm}`;
}

/**
 * "12 Sep 2026, 4:35 PM IST" -- for meeting-level / full timestamps
 * (meeting started/ended, PDF verification "Generated At", etc).
 * Returns the raw string unchanged if it cannot be parsed as a
 * timestamp, and "" for empty/null input.
 */
export function formatISTDateTime(value) {
    const date = toDate(value);
    if (!date) return typeof value === "string" ? value : "";

    const { year, month, day, hour, minute } = getISTParts(date);
    const datePart = `${String(day).padStart(2, "0")} ${MONTH_NAMES[month - 1]} ${year}`;
    return `${datePart}, ${formatTimePortion({ hour, minute })} IST`;
}

/**
 * "4:35 PM IST" -- for per-message timestamps (live transcript lines,
 * chat bubbles). Same fallback behaviour as formatISTDateTime.
 */
export function formatISTTime(value) {
    const date = toDate(value);
    if (!date) return typeof value === "string" ? value : "";

    const { hour, minute } = getISTParts(date);
    return `${formatTimePortion({ hour, minute })} IST`;
}
