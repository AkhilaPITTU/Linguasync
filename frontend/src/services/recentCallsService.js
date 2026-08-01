import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000"
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