import { PDFDocument } from "pdf-lib";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/700.css";
import "@fontsource/noto-sans-telugu/400.css";
import "@fontsource/noto-sans-devanagari/400.css";
import { getLanguageCode } from "../components/meeting/languageCode";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 42;
const LINE_HEIGHT = 21;
const FONT_FAMILY = '"Noto Sans Telugu", "Noto Sans Devanagari", "Noto Sans", sans-serif';

const cleanId = (value) => String(value || "").split(":")[0];
const languageKey = (value) => String(getLanguageCode(value)).trim().toLowerCase();

const speakerName = (entry, participants) => {
    const directName = entry.speaker_name || entry.speaker || entry.user_name || entry.name;
    if (directName) return directName;

    const speakerId = cleanId(entry.speaker_id || entry.user_id);
    const participant = participants.find(
        (candidate) => cleanId(candidate.id || candidate.user_id) === speakerId
    );
    return participant?.name || participant?.user_name || "Participant";
};

const wrapText = (context, text, maxWidth) => {
    const lines = [];
    let line = "";
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width <= maxWidth) {
            line = candidate;
            continue;
        }

        if (line) lines.push(line);
        line = word;

        while (context.measureText(line).width > maxWidth && line.length > 1) {
            let splitAt = line.length - 1;
            while (splitAt > 1 && context.measureText(line.slice(0, splitAt)).width > maxWidth) {
                splitAt -= 1;
            }
            lines.push(line.slice(0, splitAt));
            line = line.slice(splitAt);
        }
    }

    if (line) lines.push(line);
    return lines;
};

const conversationEntries = ({ transcript, translations, preferredLanguage, currentUserId, participants }) => {
    const translationByChunk = new Map();
    const preferredKey = languageKey(preferredLanguage);

    translations.forEach((item) => {
        const chunkId = item.chunk_id;
        if (!chunkId || cleanId(item.recipient_id) !== cleanId(currentUserId)) return;
        if (languageKey(item.target_language) !== preferredKey || !item.text?.trim()) return;
        translationByChunk.set(chunkId, item.text.trim());
    });

    const seen = new Set();
    return transcript.reduce((entries, item, index) => {
        const originalText = item.text?.trim();
        if (!originalText) return entries;

        const speakerId = cleanId(item.speaker_id || item.user_id);
        const identity = item.chunk_id || `${speakerId}:${originalText}:${index}`;
        if (seen.has(identity)) return entries;
        seen.add(identity);

        entries.push({
            speaker: speakerName(item, participants),
            text: translationByChunk.get(item.chunk_id) || originalText,
        });
        return entries;
    }, []);
};

const createCanvas = () => {
    const canvas = document.createElement("canvas");
    const scale = window.devicePixelRatio > 1 ? 2 : 1;
    canvas.width = PAGE_WIDTH * scale;
    canvas.height = PAGE_HEIGHT * scale;
    const context = canvas.getContext("2d");
    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    return { canvas, context };
};

const drawPage = (lines, pageNumber) => {
    const { canvas, context } = createCanvas();
    context.fillStyle = "#0f172a";
    context.font = `700 19px ${FONT_FAMILY}`;
    context.fillText("LINGUASYNC Conversation", MARGIN, MARGIN);
    context.fillStyle = "#64748b";
    context.font = `12px ${FONT_FAMILY}`;
    context.fillText(`Page ${pageNumber}`, PAGE_WIDTH - MARGIN - 42, MARGIN);

    let y = MARGIN + 38;
    context.font = `15px ${FONT_FAMILY}`;
    context.fillStyle = "#111827";
    lines.forEach((line) => {
        if (line) context.fillText(line, MARGIN, y);
        y += LINE_HEIGHT;
    });
    return canvas;
};

const pageEntries = (entries) => {
    const { context } = createCanvas();
    context.font = `15px ${FONT_FAMILY}`;
    const lines = entries.flatMap((item) => [
        ...wrapText(
            context,
            `${item.speaker}: ${item.text}`,
            PAGE_WIDTH - (MARGIN * 2)
        ),
        "",
    ]);
    const linesPerPage = Math.floor((PAGE_HEIGHT - MARGIN - 46) / LINE_HEIGHT);
    const pages = [];
    for (let offset = 0; offset < lines.length; offset += linesPerPage) {
        pages.push(lines.slice(offset, offset + linesPerPage));
    }
    return pages;
};

export const exportConversationPdf = async ({
    transcript = [],
    translations = [],
    preferredLanguage,
    currentUserId,
    participants = [],
}) => {
    if (document.fonts?.ready) await document.fonts.ready;

    const entries = conversationEntries({
        transcript,
        translations,
        preferredLanguage,
        currentUserId,
        participants,
    });
    if (!entries.length) {
        throw new Error("No transcript is available to export.");
    }

    const pdf = await PDFDocument.create();
    for (const [index, items] of pageEntries(entries).entries()) {
        const canvas = drawPage(items, index + 1);
        const image = await pdf.embedJpg(canvas.toDataURL("image/jpeg", 0.95));
        const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        page.drawImage(image, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });
    }

    const bytes = await pdf.save();
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "conversation.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    return { entryCount: entries.length };
};
