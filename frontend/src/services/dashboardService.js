import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000"
});

export const getDashboardStatistics = async () => {

    const token = localStorage.getItem("access_token");

    const response = await API.get(
        "/dashboard/statistics",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data.data;
};