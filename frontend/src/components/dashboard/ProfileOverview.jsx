import "./ProfileOverview.css";

import { useEffect, useState } from "react";

import { getProfile, updateProfile } from "../../services/profileService";

import {
    FiGlobe,
    FiPhone,
    FiVideo,
    FiMic,
    FiEdit2,
    FiAward
} from "react-icons/fi";

function ProfileOverview() {

    const [profile, setProfile] = useState({

        full_name: "",

        email: "",

        membership: "",

        preferred_language: "",

        total_calls: 0,

        video_calls: 0,

        audio_calls: 0

    });
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {

        async function fetchProfile() {

            try {

                const data = await getProfile();

                setProfile(data);

            }

            catch (error) {

                console.error("Profile Error:", error);

            }

        }

        fetchProfile();

    }, []);

    const saveProfile = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const response = await updateProfile({
                full_name: profile.full_name,
                preferred_language: profile.preferred_language,
                output_mode: profile.output_mode,
            });

            if (!response?.success) {
                throw new Error(response?.message || "Unable to update profile.");
            }

            setProfile(response.data);
            localStorage.setItem("user_name", response.data.full_name);
            setMessage("Profile updated successfully.");
            setEditing(false);
        } catch (saveError) {
            setError(saveError.response?.data?.detail || saveError.message || "Unable to update profile.");
        } finally {
            setSaving(false);
        }
    };

    return (

        <div className="profile-card">

            {/* Avatar */}

            <div className="profile-top">

                <img
                    src="/images/user.png"
                    alt="Profile"
                />

                <h2>

                    {profile.full_name}

                </h2>

                <p>

                    {profile.email}

                </p>

            </div>

            {/* Information */}

            <div className="profile-info">

                {editing && (
                    <form className="profile-edit-form" onSubmit={saveProfile}>
                        <label>
                            Name
                            <input
                                value={profile.full_name || ""}
                                onChange={(event) => setProfile((current) => ({ ...current, full_name: event.target.value }))}
                                required
                            />
                        </label>
                        <label>
                            Email
                            <input value={profile.email || ""} disabled />
                        </label>
                        <label>
                            Preferred language
                            <select
                                value={profile.preferred_language || "English"}
                                onChange={(event) => setProfile((current) => ({ ...current, preferred_language: event.target.value }))}
                            >
                                {["English", "Telugu", "Hindi", "Tamil", "Kannada", "Malayalam", "Bengali", "Marathi", "Gujarati", "Punjabi"].map((language) => (
                                    <option key={language} value={language}>{language}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Translation output
                            <select
                                value={profile.output_mode || "none"}
                                onChange={(event) => setProfile((current) => ({ ...current, output_mode: event.target.value }))}
                            >
                                <option value="none">No translation</option>
                                <option value="subtitle">Translated subtitles</option>
                            </select>
                        </label>
                        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                        <button type="button" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
                    </form>
                )}

                <div>

                    <FiPhone />

                    <span>Total Calls</span>

                    <strong>

                        {profile.total_calls}

                    </strong>

                </div>

                <div>

                    <FiVideo />

                    <span>Video Calls</span>

                    <strong>

                        {profile.video_calls}

                    </strong>

                </div>

                <div>

                    <FiMic />

                    <span>Audio Calls</span>

                    <strong>

                        {profile.audio_calls}

                    </strong>

                </div>

                <div>

                    <FiGlobe />

                    <span>Preferred Language</span>

                    <strong>

                        {profile.preferred_language}

                    </strong>

                </div>

                <div>

                    <FiAward />

                    <span>Membership</span>

                    <strong>

                        {profile.membership}

                    </strong>

                </div>

            </div>

            {/* Button */}

            <div className="profile-buttons">

                <button type="button" onClick={() => {
                    setEditing(true);
                    setMessage("");
                    setError("");
                }}>

                    <FiEdit2 />

                    Edit Profile

                </button>

            </div>

            {message && <p className="profile-feedback success">{message}</p>}
            {error && <p className="profile-feedback error">{error}</p>}

        </div>

    );

}

export default ProfileOverview;
