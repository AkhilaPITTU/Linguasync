import { useState, useEffect } from "react";
import "./LanguageSettings.css";

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
    setLanguage = () => {},
}) => {

    const [spokenLanguage, setSpokenLanguage] = useState(language);
    const [translationLanguage, setTranslationLanguage] = useState("Spanish");
    const [voiceLanguage, setVoiceLanguage] = useState("Spanish");

    useEffect(() => {
        setSpokenLanguage(language);
    }, [language]);

    const handleSave = () => {

        setLanguage(spokenLanguage);

        localStorage.setItem("spoken_language", spokenLanguage);
        localStorage.setItem("translation_language", translationLanguage);
        localStorage.setItem("voice_language", voiceLanguage);

        alert("Language settings saved successfully.");

    };

    return (

        <div className="language-settings">

            <h3>Language Settings</h3>

            <div className="setting-card">

                <label>Spoken Language</label>

                <select
                    value={spokenLanguage}
                    onChange={(e) => setSpokenLanguage(e.target.value)}
                >

                    {languages.map((lang) => (
                        <option key={lang} value={lang}>
                            {lang}
                        </option>
                    ))}

                </select>

            </div>

            <div className="setting-card">

                <label>Translate To</label>

                <select
                    value={translationLanguage}
                    onChange={(e) => setTranslationLanguage(e.target.value)}
                >

                    {languages.map((lang) => (
                        <option key={lang} value={lang}>
                            {lang}
                        </option>
                    ))}

                </select>

            </div>

            <div className="setting-card">

                <label>Voice Output</label>

                <select
                    value={voiceLanguage}
                    onChange={(e) => setVoiceLanguage(e.target.value)}
                >

                    {languages.map((lang) => (
                        <option key={lang} value={lang}>
                            {lang}
                        </option>
                    ))}

                </select>

            </div>

            <button
                className="save-language-btn"
                onClick={handleSave}
            >
                Save Settings
            </button>

        </div>

    );

};

export default LanguageSettings;