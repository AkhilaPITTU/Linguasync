import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const API = API_BASE_URL;

const getToken = () => localStorage.getItem("access_token");

const headers = () => ({
    Authorization: `Bearer ${getToken()}`
});

// ==========================================
// GET ALL USERS
// ==========================================

export const getUsers = async () => {
    try {
        const response = await axios.get(
            `${API}/api/invitation/users`,
            {
                headers: headers()
            }
        );

        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

// ==========================================
// SEND INVITATION
// ==========================================

export const sendInvitation = async (meeting_id, participants) => {
    try {
        const response = await axios.post(
            `${API}/api/invitation/send`,
            {
                meeting_id,
                participants
            },
            {
                headers: headers()
            }
        );

        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

// ==========================================
// GET PENDING INVITATIONS
// ==========================================

export const getPendingInvitations = async () => {
    try {
        const response = await axios.get(
            `${API}/api/invitation/pending`,
            {
                headers: headers()
            }
        );

        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

// ==========================================
// ACCEPT INVITATION
// ==========================================

export const acceptInvitation = async (invitationId, preferences) => {
    try {
        const response = await axios.put(
            `${API}/api/invitation/accept/${invitationId}`,
            preferences,
            {
                headers: headers()
            }
        );

        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

// ==========================================
// REJECT INVITATION
// ==========================================

export const rejectInvitation = async (invitationId) => {
    try {
        const response = await axios.put(
            `${API}/api/invitation/reject/${invitationId}`,
            {},
            {
                headers: headers()
            }
        );

        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};
