import React, { useState } from "react";
import "./profile.css";

const Profile = () => {
  const [user, setUser] = useState({
    profileImage: "https://i.pravatar.cc/150?img=12",
    fullName: "Jaya Harshini",
    username: "@jaya_harshini",
    email: "jayaharshini@gmail.com",
    role: "Student",
    preferredLanguage: "English",
    joinedDate: "July 2026",
    lastLogin: "21 July 2026, 7:45 PM",
    meetingsCompleted: 32,
    languagesUsed: 8,
    translationAccuracy: "98%",
  });

  const [activeModal, setActiveModal] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Form states
  const [editForm, setEditForm] = useState({
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    profileImage: user.profileImage,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleEditProfile = () => {
    setEditForm({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      profileImage: user.profileImage,
    });
    setSuccessMessage("");
    setActiveModal("edit");
  };

  const handleChangePassword = () => {
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setSuccessMessage("");
    setActiveModal("password");
  };

  const handleLogout = () => {
    setSuccessMessage("");
    setActiveModal("logout");
  };

  const closeModal = () => {
    setActiveModal(null);
    setSuccessMessage("");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size should be less than 5MB!");
        return;
      }
      
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        alert("Please select a valid image file (JPG, PNG, GIF, or WebP)!");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev) => ({
          ...prev,
          profileImage: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!editForm.fullName || !editForm.username || !editForm.email) {
      alert("Please fill in all fields!");
      return;
    }
    setUser({
      ...user,
      fullName: editForm.fullName,
      username: editForm.username,
      email: editForm.email,
      preferredLanguage: editForm.preferredLanguage,
      profileImage: editForm.profileImage,
    });
    setSuccessMessage("Profile updated successfully! ✓");
    setTimeout(() => {
      closeModal();
    }, 2000);
  };

  const handleSavePassword = (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      alert("Please fill in all password fields!");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      alert("Password must be at least 8 characters long!");
      return;
    }
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setSuccessMessage("Password changed successfully! ✓");
    setTimeout(() => {
      closeModal();
    }, 2000);
  };

  const handleConfirmLogout = () => {
    setSuccessMessage("Logging out...");
    setTimeout(() => {
      alert("Logged out successfully!");
      closeModal();
    }, 1000);
  };

  return (
    <div className="profile-container">
      <div className="profile-card">

        {/* Header */}
        <div className="profile-header">
          <img
            src={user.profileImage}
            alt="Profile"
            className="profile-image"
          />

          <h2>{user.fullName}</h2>
          <p className="username">{user.username}</p>
        </div>

        {/* Details */}
        <div className="profile-details">

          <div className="detail-row">
            <span>Email</span>
            <span>{user.email}</span>
          </div>

          <div className="detail-row">
            <span>Role</span>
            <span>{user.role}</span>
          </div>

          <div className="detail-row">
            <span>Preferred Language</span>
            <span>{user.preferredLanguage}</span>
          </div>

          <div className="detail-row">
            <span>Joined</span>
            <span>{user.joinedDate}</span>
          </div>

          <div className="detail-row">
            <span>Last Login</span>
            <span>{user.lastLogin}</span>
          </div>

          <div className="detail-row">
            <span>Meetings Completed</span>
            <span>{user.meetingsCompleted}</span>
          </div>

          <div className="detail-row">
            <span>Languages Used</span>
            <span>{user.languagesUsed}</span>
          </div>

          <div className="detail-row">
            <span>Translation Accuracy</span>
            <span>{user.translationAccuracy}</span>
          </div>

        </div>

        {/* Buttons */}
        <div className="profile-buttons">
          <button className="edit-btn" onClick={handleEditProfile}>Edit Profile</button>

          <button className="password-btn" onClick={handleChangePassword}>
            Change Password
          </button>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

      </div>

      {/* Modal */}
      {activeModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>&times;</button>

            {activeModal === "edit" && (
              <div className="modal-body">
                <h2>Edit Profile</h2>
                {successMessage && <div className="success-message">{successMessage}</div>}
                <form onSubmit={handleSaveProfile} className="form-container">
                  <div className="form-group">
                    <label htmlFor="profileImage">Profile Picture</label>
                    <div className="image-upload-section">
                      <div className="image-preview">
                        <img src={editForm.profileImage} alt="Profile Preview" className="preview-image" />
                      </div>
                      <div className="upload-controls">
                        <label htmlFor="imageFile" className="upload-btn">
                          📁 Choose Image
                        </label>
                        <input
                          type="file"
                          id="imageFile"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: "none" }}
                        />
                        <p className="upload-hint">JPG, PNG, GIF or WebP • Max 5MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fullName">Full Name</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={editForm.fullName}
                      onChange={handleEditChange}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={editForm.username}
                      onChange={handleEditChange}
                      placeholder="Enter your username"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="preferredLanguage">Preferred Language</label>
                    <select
                      id="preferredLanguage"
                      name="preferredLanguage"
                      value={editForm.preferredLanguage}
                      onChange={handleEditChange}
                    >
                      <option>English</option>
                      <option>Telugu</option>
                      <option>Hindi</option>
                      <option>Tamil</option>
                      <option>Kannada</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-save">Save Changes</button>
                    <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {activeModal === "password" && (
              <div className="modal-body">
                <h2>Change Password</h2>
                {successMessage && <div className="success-message">{successMessage}</div>}
                <form onSubmit={handleSavePassword} className="form-container">
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password</label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter your current password"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password (min 8 characters)"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm your new password"
                    />
                  </div>

                  <div className="password-requirements">
                    <p className="req-title">Password Requirements:</p>
                    <ul className="req-list">
                      <li>✓ Minimum 8 characters</li>
                      <li>✓ Include uppercase letters</li>
                      <li>✓ Include lowercase letters</li>
                      <li>✓ Include numbers</li>
                      <li>✓ Include special symbols</li>
                    </ul>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-save">Update Password</button>
                    <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {activeModal === "logout" && (
              <div className="modal-body">
                <h2>Logout</h2>
                <p className="modal-icon">👋</p>
                <p className="modal-description">
                  Are you sure you want to logout from your account?
                </p>
                <div className="logout-info">
                  <p className="logout-detail">✓ You will be signed out from all devices</p>
                  <p className="logout-detail">✓ Your session will be terminated</p>
                  <p className="logout-detail">✓ Your data will remain saved</p>
                </div>
                {successMessage && <div className="success-message">{successMessage}</div>}
                <div className="modal-actions">
                  <button className="btn-logout" onClick={handleConfirmLogout}>Confirm Logout</button>
                  <button className="btn-cancel" onClick={closeModal}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;