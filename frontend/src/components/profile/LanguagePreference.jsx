import { useEffect, useState } from "react";
import "./LanguagePreference.css";

const languages = [
    {
        name: "English",
        code: "en",
        native: "English",
        flag: "🇬🇧"
    },
    {
        name: "Telugu",
        code: "te",
        native: "తెలుగు",
        flag: "🇮🇳"
    },
    {
        name: "Hindi",
        code: "hi",
        native: "हिन्दी",
        flag: "🇮🇳"
    },
    {
        name: "Tamil",
        code: "ta",
        native: "தமிழ்",
        flag: "🇮🇳"
    },
    {
        name: "Kannada",
        code: "kn",
        native: "ಕನ್ನಡ",
        flag: "🇮🇳"
    },
    {
        name: "Malayalam",
        code: "ml",
        native: "മലയാളം",
        flag: "🇮🇳"
    },
    {
        name: "Bengali",
        code: "bn",
        native: "বাংলা",
        flag: "🇮🇳"
    },
    {
        name: "Marathi",
        code: "mr",
        native: "मराठी",
        flag: "🇮🇳"
    }
];

const LanguagePreference = () => {

    const [selectedLanguage, setSelectedLanguage] =
        useState("English");

    const [message, setMessage] =
        useState("");

    useEffect(() => {

        const savedLanguage =
            localStorage.getItem("user_language");

        if (savedLanguage) {
            setSelectedLanguage(savedLanguage);
        }

    }, []);

    const handleSelect = (language) => {

        setSelectedLanguage(language);

        localStorage.setItem(
            "user_language",
            language
        );

        setMessage(
            `${language} selected as your preferred language`
        );

        setTimeout(() => {
            setMessage("");
        }, 2500);
    };

    return (

        <div className="language-preference-page">

            {/* HEADER */}

            <div className="language-header">

                <div>

                    <h1>
                        Language Preference
                    </h1>

                    <p>
                        Choose your preferred language for LINGUASYNC
                        meetings and translations.
                    </p>

                </div>

                <div className="language-header-icon">
                    🌐
                </div>

            </div>


            {/* CURRENT LANGUAGE */}

            <div className="current-language-card">

                <div className="current-language-icon">
                    🗣️
                </div>

                <div>

                    <span>
                        Current Language
                    </span>

                    <h2>
                        {selectedLanguage}
                    </h2>

                </div>

            </div>


            {/* SUCCESS MESSAGE */}

            {message && (

                <div className="language-success">
                    ✓ {message}
                </div>

            )}


            {/* LANGUAGE LIST */}

            <div className="language-section">

                <div className="language-section-title">

                    <h2>
                        Available Languages
                    </h2>

                    <p>
                        Select the language you normally use.
                    </p>

                </div>


                <div className="language-grid">

                    {languages.map((language) => (

                        <button
                            key={language.code}
                            className={
                                `language-card ${
                                    selectedLanguage === language.name
                                        ? "selected"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                handleSelect(language.name)
                            }
                        >

                            <div className="language-flag">
                                {language.flag}
                            </div>

                            <div className="language-details">

                                <h3>
                                    {language.name}
                                </h3>

                                <p>
                                    {language.native}
                                </p>

                            </div>

                            <div className="language-radio">

                                {selectedLanguage ===
                                    language.name
                                    ? "✓"
                                    : ""
                                }

                            </div>

                        </button>

                    ))}

                </div>

            </div>


            {/* INFO */}

            <div className="language-info">

                <span>
                    💡
                </span>

                <div>

                    <strong>
                        How this works
                    </strong>

                    <p>
                        Your selected language is saved locally
                        and can be used as your default language
                        when joining a LINGUASYNC meeting.
                    </p>

                </div>

            </div>

        </div>

    );

};

export default LanguagePreference;