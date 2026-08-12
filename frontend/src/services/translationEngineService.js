import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const API = axios.create({
    baseURL: API_BASE_URL
});

export const getTranslationEngine = async () => {

    try {

        const response = await API.get("/dashboard/translation-engine");

        if (response.data.success) {

            return response.data.data;

        }

        return {};

    }

    catch (error) {

        console.error("Translation Engine Error:", error);

        return {};

    }

};
