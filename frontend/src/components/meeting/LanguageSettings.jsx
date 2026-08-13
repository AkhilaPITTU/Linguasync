import { useState } from "react";
import "./LanguageSettings.css";
import { getLanguageCode } from "./languageCode";

const languages = [
    "English",
    "Spanish",
    "French",
    "German",
    "Hindi",
    "Telugu",
    "Tamil",
    "Chinese",
    "Japanese",
    "Korean",
    "Arabic",
    "Urdu",
];

const LanguageSettings = ({
    language = "English",
    outputMode = "none",
    setLanguage = () => {},
    onPreferencesSave = async () => {},
}) => {

    const [preferredLanguage, setPreferredLanguage] = useState(language);
    const [selectedOutputMode, setSelectedOutputMode] = useState(outputMode);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {

        setIsSaving(true);

        try {

            await onPreferencesSave({
                preferred_language: preferredLanguage,
                source_language: getLanguageCode(preferredLanguage),
                output_mode: selectedOutputMode,
            });

            setLanguage(preferredLanguage);
            localStorage.setItem("spoken_language", getLanguageCode(preferredLanguage));
            localStorage.setItem("translation_output_mode", selectedOutputMode);

            alert("Meeting language preferences saved successfully.");

        } catch (error) {

            console.error("Unable to save meeting language preferences:", error);
            alert("Unable to save meeting language preferences. Please try again.");

        } finally {

            setIsSaving(false);

        }

    };

    return (

        <div className="language-settings">

            <h3>Language Settings</h3>

            <div className="setting-card">

                <label>Preferred subtitle language</label>

                <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                >

                    {languages.map((lang) => (
                        <option key={lang} value={lang}>
                            {lang}
                        </option>
                    ))}

                </select>

            </div>

            <div className="setting-card">

                <label>Translation Output</label>

                <select
                    value={selectedOutputMode}
                    onChange={(e) => setSelectedOutputMode(e.target.value)}
                >

                    <option value="none">No translation</option>
                    <option value="subtitle">Translated subtitles</option>
                    <option value="voice">Translated voice</option>
                    <option value="subtitle_voice">Subtitles + translated voice</option>

                </select>

            </div>

            <button
                className="save-language-btn"
                onClick={handleSave}
                disabled={isSaving}
            >
                {isSaving ? "Saving..." : "Save Meeting Preferences"}
            </button>

        </div>

    );

};

export default LanguageSettings;
