import { useState } from "react";
import { FiEye, FiEyeOff, FiGlobe, FiLock, FiMail } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";

import Popup from "../components/Popup";
import api from "../services/api";
import "./Auth.css";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!email.trim() || !password.trim()) {
      setFormError("Enter both your email address and password.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/login", { email, password });
      const data = response.data;

      if (!data.success) {
        setFormError("Login failed. Please check your details and try again.");
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("user_name", data.user.name);
      localStorage.setItem("user_email", data.user.email);
      localStorage.setItem("user_role", data.user.role);

      setShowPopup(true);
      window.setTimeout(() => {
        setShowPopup(false);
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      setFormError(
        error.response?.data?.detail || "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-labelledby="login-title">
        <aside className="auth-intro">
          <Link to="/" className="auth-brand" aria-label="LINGUASYNC home">
            <FiGlobe aria-hidden="true" />
            LINGUASYNC
          </Link>
          <p className="auth-eyebrow">REAL-TIME COMMUNICATION</p>
          <h1>Speak naturally. Connect globally.</h1>
          <p className="auth-description">
            Sign in to manage your multilingual communication workspace.
          </p>
          <ul className="auth-benefits">
            <li>Real-time multilingual conversations</li>
            <li>Private meeting history and exports</li>
            <li>Your language preferences in one place</li>
          </ul>
        </aside>

        <div className="auth-card">
          <Link to="/" className="auth-mobile-brand">LINGUASYNC</Link>
          <p className="auth-eyebrow">WELCOME BACK</p>
          <h2 id="login-title">Sign in to your account</h2>
          <p className="auth-card-description">Use your registered email and password.</p>

          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <label htmlFor="login-email">Email address</label>
            <div className="auth-input-wrap">
              <FiMail aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
              />
            </div>

            <div className="auth-label-row">
              <label htmlFor="login-password">Password</label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <div className="auth-input-wrap">
              <FiLock aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {formError && <p className="auth-message error" role="alert">{formError}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="auth-switch">
            New to LINGUASYNC? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </section>

      <Popup
        show={showPopup}
        icon="✓"
        title="Login successful"
        message="Welcome back to LINGUASYNC."
      />
    </main>
  );
}

export default Login;
