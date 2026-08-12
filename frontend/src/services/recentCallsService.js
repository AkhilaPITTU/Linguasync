import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const API = axios.create({
    baseURL: API_BASE_URL
});

export const getRecentCalls = async () => {

    try {

        const token = localStorage.getItem("access_token");

        const response = await API.get(
            "/dashboard/recent-calls",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (response.data.success) {
            return response.data.data;
        }

        return [];

    } catch (error) {

        console.error("Error fetching recent calls:", error);

        return [];

    }

};
