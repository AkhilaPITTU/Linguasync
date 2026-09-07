import "./Dashboard.css";

import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import ProfileOverview from "../components/dashboard/ProfileOverview";

function ProfileOverviewPage() {
    return (
        <div className="dashboard">
            <Sidebar />
            <div className="dashboard-right">
                <Header />
                <main className="dashboard-content">
                    <ProfileOverview />
                </main>
            </div>
        </div>
    );
}

export default ProfileOverviewPage;
