import { Routes, Route } from "react-router-dom";

import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import CreateMeeting from "../pages/CreateMeeting";
import MeetingRoom from "../pages/MeetingRoom";
import AddParticipants from "../pages/AddParticipants";

function AppRoutes() {

    return (

        <Routes>

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
                path="/dashboard"
                element={<Dashboard />}
            />

            <Route
                path="/forgot-password"
                element={<ForgotPassword />}
            />

            <Route
                path="/reset-password"
                element={<ResetPassword />}
            />

            <Route
                path="/create-meeting"
                element={<CreateMeeting />}
            />

            <Route
                path="/meeting/:meetingId"
                element={<MeetingRoom />}
            />

            <Route
                path="/meeting/:meetingId/participants"
                element={<AddParticipants />}
            />

        </Routes>

    );

}

export default AppRoutes;