import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const API = axios.create({
    baseURL: API_BASE_URL
});

export const getProfile = async () => {

    const token = localStorage.getItem(
        "access_token"
    );

    const response = await API.get(

        "/profile/",

        {

            headers: {

                Authorization: `Bearer ${token}`

            }

        }

    );

    return response.data.data;

};
