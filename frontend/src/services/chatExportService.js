import api from "./api";

const filenameFromDisposition = (disposition, meetingId) => {
    const encodedName = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    return encodedName
        ? decodeURIComponent(encodedName)
        : `LINGUASYNC_Chat_${meetingId}.json`;
};

const responseErrorMessage = async (error) => {
    const body = error.response?.data;
    if (body instanceof Blob) {
        try {
            const parsed = JSON.parse(await body.text());
            return parsed.detail || parsed.message;
        } catch {
            return null;
        }
    }
    return body?.detail || body?.message || error.message;
};

export const exportMeetingChat = async (meetingId) => {
    try {
        const response = await api.post(
            `/meeting/${encodeURIComponent(meetingId)}/chat-export`,
            {},
            { responseType: "blob" }
        );

        if (!response.data || response.data.size === 0) {
            throw new Error("The server returned an empty chat export.");
        }

        const payload = JSON.parse(await response.data.text());
        if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
            const error = new Error("No chat messages are available to export.");
            error.code = "EMPTY_CHAT";
            throw error;
        }

        const url = window.URL.createObjectURL(
            new Blob([JSON.stringify(payload, null, 2)], {
                type: "application/json",
            })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = filenameFromDisposition(
            response.headers["content-disposition"],
            meetingId
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return { messageCount: payload.messages.length };
    } catch (error) {
        const message = await responseErrorMessage(error);
        if (message && message !== error.message) {
            const normalizedError = new Error(message);
            normalizedError.code = error.code;
            throw normalizedError;
        }
        throw error;
    }
};
