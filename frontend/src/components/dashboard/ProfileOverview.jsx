import "./ProfileOverview.css";

import { useEffect, useState } from "react";

import { getProfile, updateProfile, updateProfileImage } from "../../services/profileService";
import { API_BASE_URL } from "../../services/apiConfig";
import { SUPPORTED_LANGUAGES } from "../../constants/languages";

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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [imageUploading, setImageUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState("");

    const profileImageUrl = imagePreview || (
        profile.profile_image
            ? `${API_BASE_URL}${profile.profile_image}`
            : "/images/user.png"
    );

    useEffect(() => {

        let active = true;

        async function fetchProfile() {

            try {

                const data = await getProfile();

                if (active) setProfile(data);

            }

            catch (error) {

                console.error("Profile Error:", error);
                if (active) setError(error.response?.data?.detail || error.message || "Unable to load profile.");
            } finally {
                if (active) setLoading(false);

            }

        }

        fetchProfile();

        return () => {
            active = false;
        };

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

    const changeProfileImage = async (event) => {
        const image = event.target.files?.[0];
        if (!image) return;

        if (!['image/png', 'image/jpeg'].includes(image.type)) {
            setError("Choose a PNG, JPG, or JPEG image.");
            return;
        }
        if (image.size > 5 * 1024 * 1024) {
            setError("Profile image must be 5 MB or smaller.");
            return;
        }

        const previewUrl = URL.createObjectURL(image);
        setImagePreview(previewUrl);
        setImageUploading(true);
        setError("");

        try {
            const response = await updateProfileImage(image);
            if (!response?.success) throw new Error(response?.message || "Unable to update profile image.");
            setProfile(response.data);
            URL.revokeObjectURL(previewUrl);
            setImagePreview("");
            setMessage("Profile picture updated successfully.");
        } catch (uploadError) {
            setError(uploadError.response?.data?.detail || uploadError.message || "Unable to update profile image.");
        } finally {
            setImageUploading(false);
            event.target.value = "";
        }
    };

    return (

        <div className="profile-card">

            {loading ? (
                <p className="profile-feedback">Loading profile…</p>
            ) : error && !editing ? (
                <p className="profile-feedback error">{error}</p>
            ) : (
                <>

            {/* Avatar */}

            <div className="profile-top">

                <img
                    src={profileImageUrl}
                    alt="Profile"
                />

                <label className="profile-image-action">
                    <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={changeProfileImage}
                        disabled={imageUploading}
                    />
                    {imageUploading ? "Uploading…" : "Change Profile Picture"}
                </label>

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
                                {SUPPORTED_LANGUAGES.map(({ name }) => (
                                    <option key={name} value={name}>{name}</option>
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

                </>
            )}

        </div>

    );

}

export default ProfileOverview;
