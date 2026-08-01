import React, { useState } from "react";
import "./setting.css";

const Settings = () => {
  const [settings, setSettings] = useState({
    language: "English",
    notifications: true,
    notificationSound: "Bell",
    theme: "System",
    voiceOutput: true,
    transcriptSave: true,
    secureLogging: true,
    autoDetect: true,
    fontSize: "Medium",
    voiceSpeed: "Normal",
  });

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    alert("Settings Saved Successfully!");
    console.log(settings);
  };

  return (
    <div className="settings-container">
      <div className="settings-card">

        <h2>Application Settings</h2>

        {/* Preferred Language */}
        <div className="setting-item">
          <label>Preferred Language</label>

          <select
            name="language"
            value={settings.language}
            onChange={handleChange}
          >
            <option>English</option>
            <option>Telugu</option>
            <option>Hindi</option>
            <option>Tamil</option>
            <option>Kannada</option>
            <option>Malayalam</option>
            <option>Marathi</option>
            <option>Gujarati</option>
            <option>Bengali</option>
            <option>Punjabi</option>
            <option>Odia</option>
            <option>Urdu</option>
            <option>Assamese</option>
            <option>Konkani</option>
            <option>Sanskrit</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
            <option>Italian</option>
            <option>Portuguese</option>
            <option>Russian</option>
            <option>Japanese</option>
            <option>Korean</option>
            <option>Chinese</option>
            <option>Arabic</option>
          </select>
        </div>

        {/* Notifications */}
        <div className="setting-item">
          <label>Notifications</label>

          <div className="notification-controls">
            <input
              type="checkbox"
              name="notifications"
              checked={settings.notifications}
              onChange={handleChange}
            />

            <select
              name="notificationSound"
              value={settings.notificationSound}
              onChange={handleChange}
              disabled={!settings.notifications}
            >
              <option>Bell</option>
              <option>Default</option>
              <option>Pop</option>
              <option>Chime</option>
              <option>Digital</option>
              <option>Echo</option>
              <option>Classic</option>
              <option>Soft</option>
              <option>Silent</option>
            </select>
          </div>
        </div>

        {/* Theme */}
        <div className="setting-item">
          <label>Theme</label>

          <select
            name="theme"
            value={settings.theme}
            onChange={handleChange}
          >
            <option>Light</option>
            <option>System</option>
            <option>Dark</option>
          </select>
        </div>

        {/* Voice Output */}
        <div className="setting-item">
          <label>Voice Output</label>

          <input
            type="checkbox"
            name="voiceOutput"
            checked={settings.voiceOutput}
            onChange={handleChange}
          />
        </div>

        {/* Save Transcript */}
        <div className="setting-item">
          <label>Save Transcript</label>

          <input
            type="checkbox"
            name="transcriptSave"
            checked={settings.transcriptSave}
            onChange={handleChange}
          />
        </div>

        {/* Secure Logging */}
        <div className="setting-item">
          <label>Secure Logging</label>

          <input
            type="checkbox"
            name="secureLogging"
            checked={settings.secureLogging}
            onChange={handleChange}
          />
        </div>

        {/* Auto Detect */}
        <div className="setting-item">
          <label>Auto Language Detection</label>

          <input
            type="checkbox"
            name="autoDetect"
            checked={settings.autoDetect}
            onChange={handleChange}
          />
        </div>

        {/* Font Size */}
        <div className="setting-item">
          <label>Font Size</label>

          <select
            name="fontSize"
            value={settings.fontSize}
            onChange={handleChange}
          >
            <option>Small</option>
            <option>Medium</option>
            <option>Large</option>
          </select>
        </div>

        {/* Voice Speed */}
        <div className="setting-item">
          <label>Voice Speed</label>

          <select
            name="voiceSpeed"
            value={settings.voiceSpeed}
            onChange={handleChange}
          >
            <option>Slow</option>
            <option>Normal</option>
            <option>Fast</option>
          </select>
        </div>

        <button className="save-btn" onClick={handleSave}>
          Save Settings
        </button>

      </div>
    </div>
  );
};

export default Settings;