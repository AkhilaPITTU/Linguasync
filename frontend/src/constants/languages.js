// Verified against Deepgram Nova-3's public Models & Languages Overview.
// MyMemory receives the same ISO codes and reports a safe fallback if a
// particular public translation-memory pair is unavailable.
export const SUPPORTED_LANGUAGES = [
    { name: "English", code: "en" },
    { name: "Hindi", code: "hi" },
    { name: "Telugu", code: "te" },
    { name: "Tamil", code: "ta" },
    { name: "Kannada", code: "kn" },
    { name: "Bengali", code: "bn" },
    { name: "Marathi", code: "mr" },
    { name: "Gujarati", code: "gu" },
    { name: "Punjabi", code: "pa" },
    { name: "Urdu", code: "ur" },
    { name: "Assamese", code: "as" },
    { name: "Nepali", code: "ne" },
];

const codeByName = Object.fromEntries(SUPPORTED_LANGUAGES.map(({ name, code }) => [name, code]));
const validCodes = new Set(SUPPORTED_LANGUAGES.map(({ code }) => code));

export const getLanguageCode = (language, fallback = null) => {
    const value = String(language || "").trim();
    if (codeByName[value]) return codeByName[value];
    const normalized = value.toLowerCase().replace("_", "-");
    const base = normalized.split("-", 1)[0];
    return validCodes.has(normalized) ? normalized : (validCodes.has(base) ? base : fallback);
};

export const isSupportedLanguage = (language) => Boolean(getLanguageCode(language));
