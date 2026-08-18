import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const API = axios.create({
    baseURL: API_BASE_URL
});

export const getRecentActivity = async () => {

    try {

        const token = localStorage.getItem("access_token");

        const response = await API.get(
            "/dashboard/recent-activity",
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

    }

    catch (error) {

        console.error("Recent Activity Error:", error);

        return [];

    }

};
