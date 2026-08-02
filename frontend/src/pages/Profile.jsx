import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Popup from "../components/Popup";

function Profile() {
  const navigate = useNavigate();

  const [name, setName] = useState("Lohitha");
  const [about, setAbout] = useState(
    "Breaking language barriers with AI."
  );
  const [email] = useState("lohitha@gmail.com");
  const [phone, setPhone] = useState("+91 9876543210");
  const [language, setLanguage] = useState("English");

  // Profile Image
  const [profileImage, setProfileImage] = useState(null);

  // Popup
  const [showPopup, setShowPopup] = useState(false);

  // Upload Image
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const imageURL = URL.createObjectURL(file);
    setProfileImage(imageURL);
  };

  // Save Button
  const handleSave = () => {
    setShowPopup(true);

    setTimeout(() => {
      setShowPopup(false);
    }, 2000);
  };

  // Logout
  const handleLogout = () => {
    navigate("/");
  };

  return (
    <>
      <div className="profile-page">

        {/* Header */}
        <div className="profile-header">

          <button
            className="back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ←
          </button>

          <h2>My Profile</h2>

        </div>

        {/* Profile Card */}
        <div className="profile-card">

          {/* Profile Picture */}
          <div className="profile-image-section">

            <div className="profile-image">

              <img
                src={
                  profileImage
                    ? profileImage
                    : "https://ui-avatars.com/api/?name=Lohitha&background=2b8cff&color=ffffff&size=300"
                }
                alt="Profile"
              />

              <label className="camera-icon">

                📷

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageChange}
                />

              </label>

            </div>

          </div>

          {/* Name */}
          <div className="profile-field">

            <label>Name</label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

          </div>

          {/* About */}
          <div className="profile-field">

            <label>About</label>

            <textarea
              rows="3"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />

          </div>

          {/* Email */}
          <div className="profile-field">

            <label>Email</label>

            <input
              type="email"
              value={email}
              disabled
            />

          </div>

          {/* Phone */}
          <div className="profile-field">

            <label>Phone</label>

            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

          </div>

          {/* Preferred Language */}
          <div className="profile-field">

            <label>Preferred Language</label>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option>English</option>
              <option>Telugu</option>
              <option>Hindi</option>
              <option>Tamil</option>
              <option>Kannada</option>
              <option>Malayalam</option>
              <option>French</option>
              <option>German</option>
            </select>

          </div>

          {/* Save */}
          <button
            className="save-profile-btn"
            onClick={handleSave}
          >
            💙 Save Changes
          </button>

          {/* Logout */}
          <button
            className="logout-profile-btn"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>

        </div>

      </div>

      {/* Popup */}
      <Popup
        show={showPopup}
        icon="✅"
        title="Profile Updated!"
        message="Your profile has been updated successfully."
      />

    </>
  );
}

export default Profile;