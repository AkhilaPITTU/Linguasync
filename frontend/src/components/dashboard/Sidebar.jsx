import "./Sidebar.css";

import { NavLink, useNavigate } from "react-router-dom";

import {
  FiGrid,
  FiPhone,
  FiClock,
  FiGlobe,
  FiFileText,
  FiUsers,
  FiCalendar,
  FiUser,
  FiSettings,
  FiHelpCircle,
  FiLogOut,
  FiChevronRight
} from "react-icons/fi";

function Sidebar() {

  const navigate = useNavigate();

  const handleLogout = () => {

    // Clear user session
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_role");

    // Redirect to Login
    navigate("/login", { replace: true });

  };

  const menu = [

    {
      title: "Dashboard",
      icon: <FiGrid />,
      path: "/dashboard"
    },

    {
      title: "Start Call",
      icon: <FiPhone />,
      path: "/create-meeting"
    },

    {
      title: "Call History",
      icon: <FiClock />,
      path: "/call-history"
    },

    {
      title: "Translation History",
      icon: <FiGlobe />,
      path: "/translation-history"
    },

    {
      title: "Exported Chats",
      icon: <FiFileText />,
      path: "/exports"
    },

    {
      title: "Contacts",
      icon: <FiUsers />,
      path: "/contacts"
    },

    {
      title: "Scheduled Calls",
      icon: <FiCalendar />,
      path: "/schedule"
    },

    {
      title: "Profile",
      icon: <FiUser />,
      path: "/profile"
    },

    {
      title: "Settings",
      icon: <FiSettings />,
      path: "/settings"
    },

    {
      title: "Help",
      icon: <FiHelpCircle />,
      path: "/help"
    }

  ];

  return (

    <aside className="sidebar">

      <div>

        {/* Logo */}

        <div className="logo">

          <div className="logo-circle">

            🌐

          </div>

          <div>

            <h2>LINGUASYNC</h2>

            <p>Communication Platform</p>

          </div>

        </div>

        {/* Menu */}

        <nav>

          {

            menu.map((item, index) => (

              <NavLink

                key={index}

                to={item.path}

                className={({ isActive }) =>
                  isActive
                    ? "menu active"
                    : "menu"
                }

              >

                <span className="menu-icon">

                  {item.icon}

                </span>

                <span className="menu-title">

                  {item.title}

                </span>

              </NavLink>

            ))

          }

        </nav>

      </div>

      {/* Premium */}

      <div>

        <div className="premium-box">

          <h3>

            ⭐ Premium

          </h3>

          <p>

            Unlimited calls, AI translation,
            cloud backup and priority support.

          </p>

          <button>

            Upgrade

            <FiChevronRight />

          </button>

        </div>

        {/* Logout */}

        <button
          className="logout"
          onClick={handleLogout}
        >

          <FiLogOut />

          Logout

        </button>

      </div>

    </aside>

  );

}

export default Sidebar;