import "./Sidebar.css";

import { NavLink, useNavigate } from "react-router-dom";
import {
  FiClock,
  FiFileText,
  FiGlobe,
  FiGrid,
  FiLogOut,
  FiPhone,
  FiUser,
} from "react-icons/fi";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_role");
    navigate("/login", { replace: true });
  };

  const menu = [
    { title: "Dashboard", icon: <FiGrid />, path: "/dashboard" },
    { title: "Start Call", icon: <FiPhone />, path: "/create-meeting" },
    { title: "Call History", icon: <FiClock />, path: "/call-history" },
    { title: "Translation History", icon: <FiGlobe />, path: "/translation-history" },
    { title: "Exported Chats", icon: <FiFileText />, path: "/exports" },
    { title: "Profile", icon: <FiUser />, path: "/profile" },
  ];

  return (
    <aside className="sidebar">
      <div>
        <NavLink to="/dashboard" className="logo" aria-label="LINGUASYNC dashboard">
          <div className="logo-circle">LS</div>
          <div>
            <h2>LINGUASYNC</h2>
            <p>Communication Platform</p>
          </div>
        </NavLink>

        <nav aria-label="Dashboard navigation">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? "menu active" : "menu")}
            >
              <span className="menu-icon" aria-hidden="true">{item.icon}</span>
              <span className="menu-title">{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <button className="logout" onClick={handleLogout}>
        <FiLogOut aria-hidden="true" />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default Sidebar;
