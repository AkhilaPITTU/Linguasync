import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const API = axios.create({
  baseURL: API_BASE_URL,
});

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const filenameFromDisposition = (disposition, fallback) => {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
};

// Reads a JSON error message out of an axios error whose response body was
// requested as a Blob (needed for the PDF download call), since axios
// cannot auto-parse JSON in that mode.
const readBlobErrorMessage = async (error) => {
  const data = error?.response?.data;
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed.detail || parsed.message || null;
    } catch {
      return null;
    }
  }
  return error?.response?.data?.detail || error?.response?.data?.message || null;
};

export const getExportErrorMessage = async (error) => {
  const message = await readBlobErrorMessage(error);
  return message || error?.message || "Unable to download the conversation PDF.";
};

// ===========================
// Download my own conversation for this meeting as a signed PDF
// ===========================
export const downloadConversationPdf = async (meetingId, language) => {
  const response = await API.get(`/api/conversation/${meetingId}/export-pdf`, {
    headers: getAuthHeaders(),
    params: language ? { language } : undefined,
    responseType: "blob",
  });

  const filename = filenameFromDisposition(
    response.headers["content-disposition"],
    `linguasync_conversation_${meetingId}.pdf`
  );

  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return filename;
};

// ===========================
// Upload a PDF and check whether its LinguaSync signature is still valid
// ===========================
export const verifyConversationPdf = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await API.post("/api/conversation/verify-pdf", formData, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
