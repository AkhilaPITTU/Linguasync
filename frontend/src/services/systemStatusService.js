import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000"
});

export const getSystemStatus = async () => {

    try {

        const response = await API.get("/dashboard/system-status");

        if (response.data.success) {

            return response.data.data;

        }

        return {};

    }

    catch (error) {

        console.error("System Status Error:", error);

        return {};

    }

};