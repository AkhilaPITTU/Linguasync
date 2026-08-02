import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Popup from "../components/Popup";
import api from "../services/api";

function ResetPassword() {

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPopup, setShowPopup] = useState(false);

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!password || !confirmPassword) {
      alert("Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (!token) {
      alert("Invalid or missing reset token.");
      return;
    }

    try {

      setLoading(true);

      const response = await api.post(
        "/auth/reset-password",
        {
          token: token,
          password: password,
        }
      );

      console.log(response.data);

      setLoading(false);

      setShowPopup(true);

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {

        setShowPopup(false);

        navigate("/");

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

          <h2>Reset Password</h2>

          <form onSubmit={handleSubmit}>

            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />

            <button
              className="login-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Updating..."
                : "Update Password"}
            </button>

          </form>

        </div>

      </div>

      <Popup
        show={showPopup}
        icon="🔐"
        title="Password Updated!"
        message="Your password has been updated successfully."
      />

    </>
  );
}

export default ResetPassword;