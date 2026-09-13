import "./Dashboard.css";

import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import ExportedChats from "../components/dashboard/ExportedChats";

function ExportedChatsPage() {
    return (
        <div className="dashboard">
            <Sidebar />
            <div className="dashboard-right">
                <Header />
                <main className="dashboard-content">
                    <ExportedChats />
                </main>
            </div>
        </div>
    );
}

export default ExportedChatsPage;
