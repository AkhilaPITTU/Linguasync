import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Popup from "../components/Popup";
import api from "../services/api";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      alert("All fields are required");
      return;
    }

    if (!email.includes("@")) {
      alert("Please enter a valid email");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        full_name: name,
        email: email,
        password: password,
      });

      console.log(response.data);

      setLoading(false);

      setShowPopup(true);

      setName("");
      setEmail("");
      setPassword("");

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

        {/* Left Card */}

        <div className="project-card">

          <h1>🌐 LinguaSync</h1>

          <p>
            Join the next generation multilingual communication platform.
          </p>

          <h3>Benefits</h3>

          <ul>
            <li>🌍 Global Communication</li>
            <li>🎤 AI Speech Recognition</li>
            <li>🔒 Secure Platform</li>
            <li>👥 Video Meetings</li>
          </ul>

        </div>

        {/* Right Card */}

        <div className="login-card">

          <h2>Create Account</h2>

          <form onSubmit={handleSubmit}>

            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              className="login-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating..." : "Register →"}
            </button>

          </form>

          <p>
            Already have an account?

            <Link to="/">
              <span> Login</span>
            </Link>

          </p>

        </div>

      </div>

      <Popup
        show={showPopup}
        icon="🎉"
        title="Registration Successful!"
        message="Your account has been created successfully."
      />
    </>
  );
}

export default Register;