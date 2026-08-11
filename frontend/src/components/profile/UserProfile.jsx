import "./UserProfile.css";
import { useState } from "react";

import ProfileCard from "./ProfileCard";
import EditProfile from "./EditProfile";
import LanguagePreference from "./LanguagePreference";
import Settings from "./Settings";

const UserProfile = () => {

    const [activeSection, setActiveSection] =
        useState("profile");

    const [editMode, setEditMode] =
        useState(false);


    const renderContent = () => {

        if (editMode) {

            return (

                <EditProfile
                    onClose={() =>
                        setEditMode(false)
                    }
                />

            );

        }


        switch (activeSection) {

            case "language":

                return (
                    <LanguagePreference />
                );


            case "settings":

                return (
                    <Settings />
                );


            default:

                return (

                    <ProfileCard
                        onEdit={() =>
                            setEditMode(true)
                        }
                    />

                );

        }

    };


    return (

        <div className="user-profile-page">

            <div className="user-profile-header">

                <div>

                    <h1>
                        Profile
                    </h1>

                    <p>
                        Manage your LINGUASYNC account
                        and preferences
                    </p>

                </div>

            </div>


            <div className="user-profile-layout">

                {/* Sidebar */}

                <aside className="profile-navigation">

                    <button
                        className={
                            activeSection === "profile" &&
                            !editMode
                                ? "profile-nav-item active"
                                : "profile-nav-item"
                        }
                        onClick={() => {

                            setActiveSection("profile");
                            setEditMode(false);

                        }}
                    >

                        <span>
                            👤
                        </span>

                        <div>

                            <strong>
                                Profile
                            </strong>

                            <small>
                                Your account
                            </small>

                        </div>

                    </button>


                    <button
                        className={
                            activeSection === "language" &&
                            !editMode
                                ? "profile-nav-item active"
                                : "profile-nav-item"
                        }
                        onClick={() => {

                            setActiveSection("language");
                            setEditMode(false);

                        }}
                    >

                        <span>
                            🌐
                        </span>

                        <div>

                            <strong>
                                Language
                            </strong>

                            <small>
                                Translation language
                            </small>

                        </div>

                    </button>


                    <button
                        className={
                            activeSection === "settings" &&
                            !editMode
                                ? "profile-nav-item active"
                                : "profile-nav-item"
                        }
                        onClick={() => {

                            setActiveSection("settings");
                            setEditMode(false);

                        }}
                    >

                        <span>
                            ⚙️
                        </span>

                        <div>

                            <strong>
                                Settings
                            </strong>

                            <small>
                                App preferences
                            </small>

                        </div>

                    </button>

                </aside>


                {/* Main content */}

                <main className="profile-content">

                    {renderContent()}

                </main>

            </div>

        </div>

    );

};

export default UserProfile;