import "./DashboardOverview.css";

import { FiArrowUpRight, FiClock, FiFileText, FiGlobe, FiPhone, FiUser } from "react-icons/fi";
import { Link } from "react-router-dom";

const overviewLinks = [
  {
    title: "Recent calls",
    description: "Review completed conversations and continue where you left off.",
    action: "View call history",
    path: "/call-history",
    icon: FiClock,
  },
  {
    title: "Translation history",
    description: "Find your recent multilingual conversation records.",
    action: "View translation history",
    path: "/translation-history",
    icon: FiGlobe,
  },
  {
    title: "Exported chats",
    description: "Access saved transcripts and exported conversation files.",
    action: "View exports",
    path: "/exports",
    icon: FiFileText,
  },
  {
    title: "Profile & preferences",
    description: "Manage your account details and preferred language settings.",
    action: "Open profile",
    path: "/profile",
    icon: FiUser,
  },
];

function DashboardOverview() {
  return (
    <section className="dashboard-overview" aria-label="Dashboard overview">
      <div className="dashboard-start-card">
        <div>
          <p className="overview-kicker">READY WHEN YOU ARE</p>
          <h2>Start a conversation with confidence.</h2>
          <p>Create a call, invite participants, and keep communication organized.</p>
        </div>
        <Link to="/create-meeting" className="start-call-link">
          <FiPhone aria-hidden="true" />
          Start call
        </Link>
      </div>

      <div className="overview-section-heading">
        <div>
          <p className="overview-kicker">AT A GLANCE</p>
          <h2>Your communication space</h2>
        </div>
      </div>

      <div className="dashboard-overview-grid">
        {overviewLinks.map(({ title, description, action, path, icon: Icon }) => (
          <article className="overview-card" key={path}>
            <Icon className="overview-card-icon" aria-hidden="true" />
            <h3>{title}</h3>
            <p>{description}</p>
            <Link to={path}>
              {action} <FiArrowUpRight aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DashboardOverview;
