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

    if (!response.data?.success || !response.data.data) {
        throw new Error(response.data?.message || "Unable to load profile.");
    }

    return response.data.data;

};

export const updateProfile = async (profile) => {
    const token = localStorage.getItem("access_token");
    const response = await API.put("/profile/", profile, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
};

export const updateProfileImage = async (image) => {
    const token = localStorage.getItem("access_token");
    const body = new FormData();
    body.append("image", image);

    const response = await API.put("/profile/image", body, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
};
