import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const API = axios.create({
    baseURL: API_BASE_URL
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
