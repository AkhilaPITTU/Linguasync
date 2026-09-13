import "./Dashboard.css";

import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import TranslationHistory from "../components/dashboard/TranslationHistory";

function TranslationHistoryPage() {
    return (
        <div className="dashboard">
            <Sidebar />
            <div className="dashboard-right">
                <Header />
                <main className="dashboard-content">
                    <TranslationHistory />
                </main>
            </div>
        </div>
    );
}

export default TranslationHistoryPage;
