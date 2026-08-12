import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Helper to retrieve auth header
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper to sanitize IDs if stored with trailing markers (e.g., ":1")
const getCleanUserId = () => {
  const userId = localStorage.getItem("user_id");
  if (!userId) return null;
  return userId.includes(":") ? userId.split(":")[0] : userId;
};

// ===========================
// Create Meeting
// ===========================
export const createMeeting = async (data) => {
  const userId = getCleanUserId();

  const response = await API.post(
    `/api/meeting/create?host_id=${userId}`,
    data,
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// ===========================
// Get Active Meeting
// ===========================
export const getActiveMeeting = async () => {
  const response = await API.get("/api/meeting/active", {
    headers: getAuthHeaders(),
  });

  return response.data;
};

// ===========================
// Get Meeting Details
// ===========================
export const getMeeting = async (meetingId) => {
  const response = await API.get(`/api/meeting/${meetingId}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

// ===========================
// Get Participants
// ===========================
export const getParticipants = async (meetingId) => {
  const response = await API.get(`/api/meeting/${meetingId}/participants`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

// ===========================
// Leave Meeting
// ===========================
export const leaveMeeting = async (meetingId, userId) => {
  const cleanId = userId ? userId.split(":")[0] : getCleanUserId();

  const response = await API.post(
    "/api/meeting/leave",
    {
      meeting_id: meetingId,
      user_id: cleanId,
    },
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// ===========================
// End Meeting
// ===========================
export const endMeeting = async (meetingId) => {
  const response = await API.put(
    `/api/meeting/end/${meetingId}`,
    {},
    { headers: getAuthHeaders() }
  );

  return response.data;
};

// ===========================
// Join Meeting
// ===========================
export const joinMeeting = async (
  meetingId,
  userName,
  preferredLanguage,
  outputMode
) => {
  const userId = getCleanUserId();

  // Passing user_id in BOTH query params and body to handle backend expectations safely
  const response = await API.post(
    `/api/meeting/join?user_id=${userId}`,
    {
      user_id: userId,
      meeting_id: meetingId,
      user_name: userName,
      preferred_language: preferredLanguage,
      output_mode: outputMode,
    },
    { headers: getAuthHeaders() }
  );

  return response.data;
};
