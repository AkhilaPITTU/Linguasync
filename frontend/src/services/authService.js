import api from "./api";

export const login = async (email, password) => {

    const response = await api.post("/auth/login", {
        email,
        password,
    });

    const data = response.data;

    if (data.success) {

        localStorage.setItem(
            "access_token",
            data.access_token
        );

        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        localStorage.setItem(
            "user_id",
            data.user.id
        );

        localStorage.setItem(
            "user_name",
            data.user.name
        );

        localStorage.setItem(
            "user_email",
            data.user.email
        );

        localStorage.setItem(
            "user_role",
            data.user.role
        );

    }

    return data;
};

export const logout = () => {

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_role");

};