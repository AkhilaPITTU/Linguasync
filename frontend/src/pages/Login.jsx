import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Popup from "../components/Popup";
import api from "../services/api";

function Login() {

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPopup, setShowPopup] = useState(false);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e) => {

        e.preventDefault();

        if (!email.trim() || !password.trim()) {
            alert("Please enter email and password.");
            return;
        }

        try {

            setLoading(true);

            const response = await api.post(
                "/auth/login",
                {
                    email,
                    password,
                }
            );

            const data = response.data;

            if (!data.success) {

                setLoading(false);

                alert("Login failed.");

                return;

            }

            // Save JWT Token
            localStorage.setItem(
                "access_token",
                data.access_token
            );

            // Save Complete User Object
            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            // Save Individual User Fields
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

            setLoading(false);

            setShowPopup(true);

            setTimeout(() => {

                setShowPopup(false);

                navigate("/dashboard");

            }, 1500);

        }

        catch (error) {

            setLoading(false);

            if (error.response) {

                alert(error.response.data.detail);

            } else {

                alert("Unable to connect to backend.");

            }

        }

    };

    return (
        <>
            <div className="login-container">

                {/* Left Card */}

                <div className="project-card">

                    <h1>🌐 LinguaSync</h1>

                    <p>
                        Transformer Based Real-Time
                        Multilingual Speech Translation
                    </p>

                    <h3>Features</h3>

                    <ul>

                        <li>🌍 Real-Time Translation</li>

                        <li>🎤 Speech to Text</li>

                        <li>🔒 Secure Logging</li>

                        <li>👥 Video Conferencing</li>

                    </ul>

                </div>

                {/* Right Card */}

                <div className="login-card">

                    <h2>Welcome Back</h2>

                    <form onSubmit={handleLogin}>

                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                        />

                        <div className="password-box">

                            <input
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                            />

                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }
                            >
                                {
                                    showPassword
                                        ? "🙈"
                                        : "👁️"
                                }
                            </button>

                        </div>

                        <div
                            style={{
                                textAlign: "right",
                                marginBottom: "15px",
                            }}
                        >

                            <Link
                                to="/forgot-password"
                                className="forgot-link"
                            >

                                Forgot Password?

                            </Link>

                        </div>

                        <button
                            className="login-btn"
                            type="submit"
                            disabled={loading}
                        >

                            {
                                loading
                                    ? "Logging In..."
                                    : "Login →"
                            }

                        </button>

                    </form>

                    <p>

                        Don't have an account?

                        <Link to="/register">

                            <span> Register</span>

                        </Link>

                    </p>

                </div>

            </div>

            <Popup
                show={showPopup}
                icon="✅"
                title="Login Successful!"
                message="Welcome back to LinguaSync."
            />

        </>
    );

}

export default Login;