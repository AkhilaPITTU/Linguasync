import {
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import CreateMeeting from "../pages/CreateMeeting";
import MeetingRoom from "../pages/MeetingRoom";
import AddParticipants from "../pages/AddParticipants";
import RecentCallsPage from "../pages/RecentCallsPage";
import TranslationHistoryPage from "../pages/TranslationHistoryPage";
import ExportedChatsPage from "../pages/ExportedChatsPage";
import ProfileOverviewPage from "../pages/ProfileOverviewPage";
import IncomingInvitationPopup from "../components/invitations/IncomingInvitationPopup";


// ==========================================
// Protected Route
// ==========================================

function ProtectedRoute({ children }) {

    const token = localStorage.getItem(
        "access_token"
    );

    return token
        ? <><IncomingInvitationPopup />{children}</>
        : <Navigate to="/login" replace />;

}


function AppRoutes() {

    return (

        <Routes>

            {/* Public Routes */}

            <Route
                path="/"
                element={<Landing />}
            />

            <Route
                path="/login"
                element={<Login />}
            />

            <Route
                path="/register"
                element={<Register />}
            />

            <Route
                path="/forgot-password"
                element={<ForgotPassword />}
            />

            <Route
                path="/reset-password"
                element={<ResetPassword />}
            />


            {/* Protected Routes */}

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/create-meeting"
                element={
                    <ProtectedRoute>
                        <CreateMeeting />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/call-history"
                element={
                    <ProtectedRoute>
                        <RecentCallsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/translation-history"
                element={
                    <ProtectedRoute>
                        <TranslationHistoryPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/exports"
                element={
                    <ProtectedRoute>
                        <ExportedChatsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <ProfileOverviewPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/meeting/:meetingId"
                element={
                    <ProtectedRoute>
                        <MeetingRoom />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/meeting/:meetingId/participants"
                element={
                    <ProtectedRoute>
                        <AddParticipants />
                    </ProtectedRoute>
                }
            />

            {/* Unknown Route */}

            <Route
                path="*"
                element={<Navigate to="/" replace />}
            />

        </Routes>

    );

}

export default AppRoutes;
