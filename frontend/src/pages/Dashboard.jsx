import "./Dashboard.css";

import ActiveCommunication from "../components/dashboard/ActiveCommunication";
import DashboardOverview from "../components/dashboard/DashboardOverview";
import Header from "../components/dashboard/Header";
import Sidebar from "../components/dashboard/Sidebar";

function Dashboard() {
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="dashboard-right">
        <Header />
        <main className="dashboard-content">
          <DashboardOverview />
          <ActiveCommunication />
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
