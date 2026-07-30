import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Popup from "../components/Popup";
import api from "../services/api";

function ForgotPassword() {

  const [email, setEmail] = useState("");

  const [showPopup, setShowPopup] = useState(false);

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!email) {
      alert("Please enter your registered email.");
      return;
    }

    try {

      setLoading(true);

      const response = await api.post(
        "/auth/forgot-password",
        {
          email,
        }
      );

      console.log(response.data);

      setLoading(false);

      setShowPopup(true);

      setEmail("");

      setTimeout(() => {

        setShowPopup(false);

        // User should open the email and click the reset link.
        // No automatic navigation.

      }, 2000);

    } catch (error) {

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

        <div className="login-card">

          <h2>Forgot Password</h2>

          <p
            style={{
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            Enter your registered email address.
          </p>

          <form onSubmit={handleSubmit}>

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <button
              className="login-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send Reset Link"}
            </button>

          </form>

          <p>
            Remember your password?

            <Link to="/">
              <span> Login</span>
            </Link>

          </p>

        </div>

      </div>

      <Popup
        show={showPopup}
        icon="📧"
        title="Reset Link Sent!"
        message="Please check your email to reset your password."
      />

    </>
  );
}

export default ForgotPassword;