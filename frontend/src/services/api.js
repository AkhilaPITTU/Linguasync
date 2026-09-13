import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        "Content-Type": "application/json",
    },
});

// Automatically attach JWT token
api.interceptors.request.use(
    (config) => {

        const token = localStorage.getItem("access_token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("access_token");
            const currentPath = `${window.location.pathname}${window.location.search}`;
            if (window.location.pathname !== "/login") {
                window.location.assign(`/login?returnTo=${encodeURIComponent(currentPath)}`);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
