import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000"
});

export const getRecentActivity = async () => {

    try {

        const response = await API.get("/dashboard/recent-activity");

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