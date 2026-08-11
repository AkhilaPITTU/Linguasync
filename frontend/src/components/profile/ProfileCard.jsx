import "./ProfileCard.css";
import { useEffect, useState } from "react";

const ProfileCard = ({ onEdit }) => {

    const [user, setUser] = useState({
        name: "User",
        email: "",
        language: "English"
    });

    useEffect(() => {

        const name =
            localStorage.getItem("user_name") || "User";

        const email =
            localStorage.getItem("user_email") || "";

        const language =
            localStorage.getItem("user_language") || "English";

        setUser({
            name,
            email,
            language
        });

    }, []);

    const getInitials = (name) => {

        if (!name) return "U";

        const parts = name.trim().split(" ");

        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }

        return (
            parts[0].charAt(0) +
            parts[parts.length - 1].charAt(0)
        ).toUpperCase();

    };

    return (

        <div className="profile-card">

            <div className="profile-card-top">

                <div className="profile-avatar">

                    {getInitials(user.name)}

                </div>

                <div className="profile-main-info">

                    <h2>
                        {user.name}
                    </h2>

                    <p>
                        {user.email || "No email available"}
                    </p>

                </div>

            </div>


            <div className="profile-details">

                <div className="profile-detail">

                    <span className="detail-icon">
                        🌐
                    </span>

                    <div>

                        <span className="detail-label">
                            Preferred Language
                        </span>

                        <strong>
                            {user.language}
                        </strong>

                    </div>

                </div>


                <div className="profile-detail">

                    <span className="detail-icon">
                        🎙️
                    </span>

                    <div>

                        <span className="detail-label">
                            Translation
                        </span>

                        <strong>
                            Real-time
                        </strong>

                    </div>

                </div>


                <div className="profile-detail">

                    <span className="detail-icon">
                        🔒
                    </span>

                    <div>

                        <span className="detail-label">
                            Account
                        </span>

                        <strong>
                            Active
                        </strong>

                    </div>

                </div>

            </div>


            {onEdit && (

                <button
                    className="profile-edit-button"
                    onClick={onEdit}
                >
                    ✏️ Edit Profile
                </button>

            )}

        </div>

    );

};

export default ProfileCard;