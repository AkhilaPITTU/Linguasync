import { useEffect, useState } from "react";
import "./EditProfile.css";

const EditProfile = () => {

    const [userName, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [language, setLanguage] = useState("English");
    const [message, setMessage] = useState("");

    useEffect(() => {

        const savedName =
            localStorage.getItem("user_name");

        const savedEmail =
            localStorage.getItem("user_email");

        const savedLanguage =
            localStorage.getItem("user_language");

        if (savedName) {
            setUserName(savedName);
        }

        if (savedEmail) {
            setEmail(savedEmail);
        }

        if (savedLanguage) {
            setLanguage(savedLanguage);
        }

    }, []);

    const handleSave = (e) => {

        e.preventDefault();

        localStorage.setItem(
            "user_name",
            userName
        );

        localStorage.setItem(
            "user_email",
            email
        );

        localStorage.setItem(
            "user_language",
            language
        );

        setMessage(
            "Profile updated successfully!"
        );

        setTimeout(() => {
            setMessage("");
        }, 2500);

    };

    return (

        <div className="edit-profile-page">

            <div className="edit-profile-header">

                <div>
                    <h1>Edit Profile</h1>

                    <p>
                        Update your LINGUASYNC profile information
                    </p>
                </div>

                <div className="profile-edit-icon">
                    ✏️
                </div>

            </div>


            <div className="edit-profile-card">

                <div className="profile-avatar">

                    {userName
                        ? userName.charAt(0).toUpperCase()
                        : "U"
                    }

                </div>


                <form onSubmit={handleSave}>

                    <div className="form-group">

                        <label>
                            Full Name
                        </label>

                        <input
                            type="text"
                            value={userName}
                            onChange={(e) =>
                                setUserName(e.target.value)
                            }
                            placeholder="Enter your name"
                            required
                        />

                    </div>


                    <div className="form-group">

                        <label>
                            Email Address
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            placeholder="Enter your email"
                            required
                        />

                    </div>


                    <div className="form-group">

                        <label>
                            Preferred Language
                        </label>

                        <select
                            value={language}
                            onChange={(e) =>
                                setLanguage(e.target.value)
                            }
                        >

                            <option value="English">
                                English
                            </option>

                            <option value="Telugu">
                                Telugu
                            </option>

                            <option value="Hindi">
                                Hindi
                            </option>

                            <option value="Tamil">
                                Tamil
                            </option>

                            <option value="Kannada">
                                Kannada
                            </option>

                            <option value="Malayalam">
                                Malayalam
                            </option>

                            <option value="Bengali">
                                Bengali
                            </option>

                            <option value="Marathi">
                                Marathi
                            </option>

                        </select>

                    </div>


                    {message && (

                        <div className="success-message">
                            ✓ {message}
                        </div>

                    )}


                    <button
                        type="submit"
                        className="save-profile-button"
                    >
                        Save Changes
                    </button>

                </form>

            </div>

        </div>

    );

};

export default EditProfile;