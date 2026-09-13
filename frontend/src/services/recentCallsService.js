import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const API = axios.create({
    baseURL: API_BASE_URL
});

export const getRecentCalls = async () => {
    const token = localStorage.getItem("access_token");
    const response = await API.get("/dashboard/recent-calls", {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.data?.success || !Array.isArray(response.data.data)) {
        throw new Error(response.data?.message || "Unable to load call history.");
    }

    return response.data.data;
};
