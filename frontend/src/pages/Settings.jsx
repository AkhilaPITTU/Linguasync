import "./Settings.css";
import { useEffect, useState } from "react";

const Settings = () => {

    const [settings, setSettings] = useState({
        notifications: true,
        sound: true,
        autoTranslate: true,
        showTranscript: true,
        darkMode: false,
        compactMode: false
    });

    useEffect(() => {

        const savedSettings =
            localStorage.getItem("linguasync_settings");

        if (savedSettings) {

            try {

                setSettings(
                    JSON.parse(savedSettings)
                );

            } catch (error) {

                console.error(
                    "Failed to load settings:",
                    error
                );

            }

        }

    }, []);

    const updateSetting = (key, value) => {

        const updatedSettings = {
            ...settings,
            [key]: value
        };

        setSettings(updatedSettings);

        localStorage.setItem(
            "linguasync_settings",
            JSON.stringify(updatedSettings)
        );

        // Apply dark mode globally
        if (key === "darkMode") {

            document.body.classList.toggle(
                "dark-mode",
                value
            );

        }

    };

    const clearSavedData = () => {

        const confirmed = window.confirm(
            "Are you sure you want to clear your saved LINGUASYNC data?"
        );

        if (!confirmed) return;

        localStorage.removeItem(
            "linguasync_settings"
        );

        localStorage.removeItem(
            "linguasync_chat_history"
        );

        localStorage.removeItem(
            "linguasync_translation_history"
        );

        alert(
            "Saved LINGUASYNC data has been cleared."
        );

    };

    const logout = () => {

        const confirmed = window.confirm(
            "Are you sure you want to logout?"
        );

        if (!confirmed) return;

        localStorage.removeItem("access_token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_name");

        window.location.href = "/login";

    };

    return (

        <div className="settings-page">

            {/* HEADER */}

            <div className="settings-header">

                <div>

                    <h1>
                        Settings
                    </h1>

                    <p>
                        Customize your LINGUASYNC experience
                    </p>

                </div>

                <div className="settings-icon">
                    ⚙️
                </div>

            </div>


            {/* GENERAL SETTINGS */}

            <section className="settings-section">

                <div className="section-title">

                    <span>
                        ⚙️
                    </span>

                    <div>

                        <h2>
                            General
                        </h2>

                        <p>
                            Manage your meeting preferences
                        </p>

                    </div>

                </div>


                <div className="setting-list">

                    {/* AUTO TRANSLATE */}

                    <div className="setting-item">

                        <div className="setting-info">

                            <h3>
                                Automatic Translation
                            </h3>

                            <p>
                                Automatically translate incoming speech
                            </p>

                        </div>

                        <button
                            className={
                                `toggle ${
                                    settings.autoTranslate
                                        ? "active"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                updateSetting(
                                    "autoTranslate",
                                    !settings.autoTranslate
                                )
                            }
                        >

                            <span></span>

                        </button>

                    </div>


                    {/* TRANSCRIPT */}

                    <div className="setting-item">

                        <div className="setting-info">

                            <h3>
                                Live Transcript
                            </h3>

                            <p>
                                Show real-time speech transcription
                            </p>

                        </div>

                        <button
                            className={
                                `toggle ${
                                    settings.showTranscript
                                        ? "active"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                updateSetting(
                                    "showTranscript",
                                    !settings.showTranscript
                                )
                            }
                        >

                            <span></span>

                        </button>

                    </div>


                    {/* COMPACT MODE */}

                    <div className="setting-item">

                        <div className="setting-info">

                            <h3>
                                Compact Mode
                            </h3>

                            <p>
                                Use a more compact meeting interface
                            </p>

                        </div>

                        <button
                            className={
                                `toggle ${
                                    settings.compactMode
                                        ? "active"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                updateSetting(
                                    "compactMode",
                                    !settings.compactMode
                                )
                            }
                        >

                            <span></span>

                        </button>

                    </div>

                </div>

            </section>


            {/* NOTIFICATION SETTINGS */}

            <section className="settings-section">

                <div className="section-title">

                    <span>
                        🔔
                    </span>

                    <div>

                        <h2>
                            Notifications
                        </h2>

                        <p>
                            Control meeting notifications
                        </p>

                    </div>

                </div>


                <div className="setting-list">

                    <div className="setting-item">

                        <div className="setting-info">

                            <h3>
                                Notifications
                            </h3>

                            <p>
                                Receive meeting and invitation notifications
                            </p>

                        </div>

                        <button
                            className={
                                `toggle ${
                                    settings.notifications
                                        ? "active"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                updateSetting(
                                    "notifications",
                                    !settings.notifications
                                )
                            }
                        >

                            <span></span>

                        </button>

                    </div>


                    <div className="setting-item">

                        <div className="setting-info">

                            <h3>
                                Sound Effects
                            </h3>

                            <p>
                                Play sounds for notifications and events
                            </p>

                        </div>

                        <button
                            className={
                                `toggle ${
                                    settings.sound
                                        ? "active"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                updateSetting(
                                    "sound",
                                    !settings.sound
                                )
                            }
                        >

                            <span></span>

                        </button>

                    </div>

                </div>

            </section>


            {/* APPEARANCE */}

            <section className="settings-section">

                <div className="section-title">

                    <span>
                        🎨
                    </span>

                    <div>

                        <h2>
                            Appearance
                        </h2>

                        <p>
                            Customize how LINGUASYNC looks
                        </p>

                    </div>

                </div>


                <div className="setting-list">

                    <div className="setting-item">

                        <div className="setting-info">

                            <h3>
                                Dark Mode
                            </h3>

                            <p>
                                Use a darker interface
                            </p>

                        </div>

                        <button
                            className={
                                `toggle ${
                                    settings.darkMode
                                        ? "active"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                updateSetting(
                                    "darkMode",
                                    !settings.darkMode
                                )
                            }
                        >

                            <span></span>

                        </button>

                    </div>

                </div>

            </section>


            {/* DATA */}

            <section className="settings-section danger-section">

                <div className="section-title">

                    <span>
                        🗑️
                    </span>

                    <div>

                        <h2>
                            Data & Privacy
                        </h2>

                        <p>
                            Manage your locally saved data
                        </p>

                    </div>

                </div>


                <div className="data-actions">

                    <button
                        className="clear-button"
                        onClick={clearSavedData}
                    >
                        Clear Saved Data
                    </button>

                </div>

            </section>


            {/* ACCOUNT */}

            <section className="settings-section">

                <div className="section-title">

                    <span>
                        👤
                    </span>

                    <div>

                        <h2>
                            Account
                        </h2>

                        <p>
                            Manage your LINGUASYNC account
                        </p>

                    </div>

                </div>


                <div className="data-actions">

                    <button
                        className="logout-button"
                        onClick={logout}
                    >
                        Logout
                    </button>

                </div>

            </section>


            <div className="settings-footer">

                <p>
                    LINGUASYNC
                </p>

                <span>
                    Your conversations. Your language. Your connection.
                </span>

            </div>

        </div>

    );

};

export default Settings;
