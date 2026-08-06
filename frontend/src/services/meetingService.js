import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000"
});

// ===========================
// Create Meeting
// ===========================

export const createMeeting = async (data) => {

    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");

    const response = await API.post(
        `/api/meeting/create?host_id=${userId}`,
        data,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;

};

// ===========================
// Get Active Meeting
// ===========================

export const getActiveMeeting = async () => {

    const token = localStorage.getItem("access_token");

    const response = await API.get(
        "/api/meeting/active",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;

};

// ===========================
// Get Meeting Details
// ===========================

export const getMeeting = async (meetingId) => {

    const token = localStorage.getItem("access_token");

    const response = await API.get(
        `/api/meeting/${meetingId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;

};

// ===========================
// Get Participants
// ===========================

export const getParticipants = async (meetingId) => {

    const token = localStorage.getItem("access_token");

    const response = await API.get(
        `/api/meeting/${meetingId}/participants`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;

};

// ===========================
// Leave Meeting
// ===========================

export const leaveMeeting = async (meetingId, userId) => {

    const token = localStorage.getItem("access_token");

    const response = await API.post(
        "/api/meeting/leave",
        {
            meeting_id: meetingId,
            user_id: userId
        },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;

};

// ===========================
// End Meeting
// ===========================

export const endMeeting = async (meetingId) => {

    const token = localStorage.getItem("access_token");

    const response = await API.put(
        `/api/meeting/end/${meetingId}`,
        {},
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;

};
// ===========================
// Join Meeting
// ===========================

export const joinMeeting = async (meetingId, userName, language) => {

    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");

    const response = await API.post(

        `/api/meeting/join?user_id=${userId}`,

        {
            meeting_id: meetingId,
            user_name: userName,
            language: language
        },

        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }

    );

    return response.data;

};