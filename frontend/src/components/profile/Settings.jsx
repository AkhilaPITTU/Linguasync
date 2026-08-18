import "./Settings.css";
import { useEffect, useState } from "react";

const Settings = () => {

    const [settings, setSettings] = useState({
        notifications: true,
        sound: true,
        autoJoin: false,
        showTranscript: true,
        autoTranslation: true
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
                    "Unable to load settings:",
                    error
                );

            }

        }

    }, []);


    const updateSetting = (key) => {

        setSettings(prev => {

            const updated = {
                ...prev,
                [key]: !prev[key]
            };

            localStorage.setItem(
                "linguasync_settings",
                JSON.stringify(updated)
            );

            return updated;

        });

    };


    return (

        <div className="settings-page">

            <div className="settings-header">

                <div>

                    <h2>
                        Settings
                    </h2>

                    <p>
                        Manage your LINGUASYNC preferences
                    </p>

                </div>

            </div>


            {/* Meeting Settings */}

            <section className="settings-section">

                <div className="settings-section-title">

                    <span>
                        🎥
                    </span>

                    <div>

                        <h3>
                            Meeting Settings
                        </h3>

                        <p>
                            Configure your meeting experience
                        </p>

                    </div>

                </div>


                <SettingItem
                    title="Auto Join Meetings"
                    description="Automatically join an active meeting when available"
                    enabled={settings.autoJoin}
                    onChange={() =>
                        updateSetting("autoJoin")
                    }
                />

                <SettingItem
                    title="Show Transcript"
                    description="Display live speech transcripts during meetings"
                    enabled={settings.showTranscript}
                    onChange={() =>
                        updateSetting("showTranscript")
                    }
                />

            </section>


            {/* Translation Settings */}

            <section className="settings-section">

                <div className="settings-section-title">

                    <span>
                        🌐
                    </span>

                    <div>

                        <h3>
                            Translation
                        </h3>

                        <p>
                            Control real-time translation behaviour
                        </p>

                    </div>

                </div>


                <SettingItem
                    title="Automatic Translation"
                    description="Automatically translate detected speech"
                    enabled={settings.autoTranslation}
                    onChange={() =>
                        updateSetting("autoTranslation")
                    }
                />

            </section>


            {/* Notification Settings */}

            <section className="settings-section">

                <div className="settings-section-title">

                    <span>
                        🔔
                    </span>

                    <div>

                        <h3>
                            Notifications
                        </h3>

                        <p>
                            Manage meeting notifications
                        </p>

                    </div>

                </div>


                <SettingItem
                    title="Notifications"
                    description="Receive notifications for invitations and meetings"
                    enabled={settings.notifications}
                    onChange={() =>
                        updateSetting("notifications")
                    }
                />

                <SettingItem
                    title="Meeting Sounds"
                    description="Play sounds when participants join or leave"
                    enabled={settings.sound}
                    onChange={() =>
                        updateSetting("sound")
                    }
                />

            </section>

        </div>

    );

};


const SettingItem = ({
    title,
    description,
    enabled,
    onChange
}) => {

    return (

        <div className="setting-item">

            <div className="setting-text">

                <h4>
                    {title}
                </h4>

                <p>
                    {description}
                </p>

            </div>


            <button
                type="button"
                className={
                    enabled
                        ? "setting-toggle active"
                        : "setting-toggle"
                }
                onClick={onChange}
                aria-label={title}
            >

                <span className="toggle-circle"></span>

            </button>

        </div>

    );

};


export default Settings;