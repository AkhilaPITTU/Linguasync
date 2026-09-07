import "./Dashboard.css";

import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import RecentCalls from "../components/dashboard/RecentCalls";

function RecentCallsPage() {
    return (
        <div className="dashboard">
            <Sidebar />
            <div className="dashboard-right">
                <Header />
                <main className="dashboard-content">
                    <RecentCalls />
                </main>
            </div>
        </div>
    );
}

export default RecentCallsPage;
