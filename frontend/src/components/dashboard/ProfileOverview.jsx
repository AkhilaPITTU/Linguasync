import "./ProfileOverview.css";

import { useEffect, useState } from "react";

import { getProfile } from "../../services/profileService";

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

                <button>

                    <FiEdit2 />

                    Edit Profile

                </button>

            </div>

        </div>

    );

}

export default ProfileOverview;