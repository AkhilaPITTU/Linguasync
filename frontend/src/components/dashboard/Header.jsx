import "./Header.css";

import { FiUser } from "react-icons/fi";
import { Link } from "react-router-dom";

function Header() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName =
    storedUser.name ||
    storedUser.full_name ||
    localStorage.getItem("user_name") ||
    "there";

  return (
    <header className="dashboard-header-bar">
      <div>
        <p className="dashboard-header-kicker">YOUR WORKSPACE</p>
        <h1>Welcome back, {userName}</h1>
        <p className="dashboard-header-copy">
          Keep your multilingual communication organized from one place.
        </p>
      </div>

      <Link to="/profile" className="dashboard-profile-link" aria-label="Open profile">
        <FiUser aria-hidden="true" />
        <span>Profile</span>
      </Link>
    </header>
  );
}

export default Header;
