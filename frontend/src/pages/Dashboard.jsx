import "./Dashboard.css";

// Dashboard Components
import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import StatsCards from "../components/dashboard/StatsCards";
import QuickActions from "../components/dashboard/QuickActions";
import ActiveCommunication from "../components/dashboard/ActiveCommunication";
import ProfileOverview from "../components/dashboard/ProfileOverview";
import RecentCalls from "../components/dashboard/RecentCalls";
import TranslationHistory from "../components/dashboard/TranslationHistory";
import ExportedChats from "../components/dashboard/ExportedChats";
import RecentActivity from "../components/dashboard/RecentActivity";
import TranslationEngine from "../components/dashboard/TranslationEngine";
import SystemStatus from "../components/dashboard/SystemStatus";

function Dashboard() {
  return (
    <div className="dashboard">

      {/* ================= Sidebar ================= */}
      <Sidebar />

      {/* ================= Right Section ================= */}

      <div className="dashboard-right">

        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="dashboard-content">

          {/* Statistics */}
          <StatsCards />

          {/* ==========================================================
              ROW 1
          ========================================================== */}

          <div className="dashboard-grid dashboard-grid-3">

            <QuickActions />

            <ActiveCommunication />

            <ProfileOverview />

          </div>

          {/* ==========================================================
              ROW 2
          ========================================================== */}

          <div className="dashboard-grid dashboard-grid-3">

            <RecentCalls />

            <TranslationHistory />

            <ExportedChats />

          </div>

          {/* ==========================================================
              ROW 3
          ========================================================== */}

          <div className="dashboard-grid dashboard-grid-3">

            <RecentActivity />

            <TranslationEngine />

            <SystemStatus />

          </div>

        </main>

      </div>

    </div>
  );
}

export default Dashboard;