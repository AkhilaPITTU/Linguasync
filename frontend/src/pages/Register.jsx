import { useState } from "react";
import { FiEye, FiEyeOff, FiGlobe, FiLock, FiMail, FiUser } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";

import Popup from "../components/Popup";
import api from "../services/api";
import "./Auth.css";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!name.trim() || !email.trim() || !password) {
      setFormError("Complete all fields to create your account.");
      return;
    }
    if (!email.includes("@")) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/register", {
        full_name: name,
        email,
        password,
      });

      setShowPopup(true);
      setName("");
      setEmail("");
      setPassword("");
      window.setTimeout(() => {
        setShowPopup(false);
        navigate("/login");
      }, 1800);
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
      <section className="auth-shell" aria-labelledby="register-title">
        <aside className="auth-intro">
          <Link to="/" className="auth-brand" aria-label="LINGUASYNC home">
            <FiGlobe aria-hidden="true" />
            LINGUASYNC
          </Link>
          <p className="auth-eyebrow">MULTILINGUAL COMMUNICATION</p>
          <h1>Make every conversation accessible.</h1>
          <p className="auth-description">
            Create your account to access a focused multilingual communication dashboard.
          </p>
          <ul className="auth-benefits">
            <li>Choose your preferred output language</li>
            <li>Keep communication history organized</li>
            <li>Access your workspace from one dashboard</li>
          </ul>
        </aside>

        <div className="auth-card">
          <Link to="/" className="auth-mobile-brand">LINGUASYNC</Link>
          <p className="auth-eyebrow">CREATE ACCOUNT</p>
          <h2 id="register-title">Join LINGUASYNC</h2>
          <p className="auth-card-description">A few details are all you need to begin.</p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="register-name">Full name</label>
            <div className="auth-input-wrap">
              <FiUser aria-hidden="true" />
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={loading}
              />
            </div>

            <label htmlFor="register-email">Email address</label>
            <div className="auth-input-wrap">
              <FiMail aria-hidden="true" />
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
              />
            </div>

            <label htmlFor="register-password">Password</label>
            <div className="auth-input-wrap">
              <FiLock aria-hidden="true" />
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 6 characters"
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>

      <Popup
        show={showPopup}
        icon="✓"
        title="Account created"
        message="Your account is ready. Redirecting you to sign in."
      />
    </main>
  );
}

export default Register;
