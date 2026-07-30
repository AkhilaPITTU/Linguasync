import "./TranslationHistory.css";

import { useEffect, useState } from "react";

import { getTranslationHistory } from "../../services/translationHistoryService";

import {
    FiGlobe,
    FiFileText,
    FiDownload,
    FiCheckCircle
} from "react-icons/fi";

function TranslationHistory() {

    const [translations, setTranslations] = useState([]);

    useEffect(() => {

        async function fetchTranslations() {

            try {

                const data = await getTranslationHistory();

                setTranslations(data);

            }

            catch (error) {

                console.error("Translation History Error:", error);

            }

        }

        fetchTranslations();

    }, []);

    return (

        <div className="dashboard-card translation-history">

            <div className="card-header">

                <h2>

                    Translation History

                </h2>

                <span>

                    View All

                </span>

            </div>

            {

                translations.map((item) => (

                    <div
                        key={item.id}
                        className="translation-card"
                    >

                        <div className="translation-top">

                            <div className="language-box">

                                <FiGlobe />

                                <strong>

                                    {item.source_language}

                                    →

                                    {item.target_language}

                                </strong>

                            </div>

                            <span className="mode">

                                {item.type}

                            </span>

                        </div>

                        <div className="translation-middle">

                            <div>

                                <small>

                                    Words

                                </small>

                                <p>

                                    <FiCheckCircle />

                                    {item.words}

                                </p>

                            </div>

                            <div>

                                <small>

                                    Date

                                </small>

                                <p>

                                    {item.time}

                                </p>

                            </div>

                        </div>

                        <div className="translation-buttons">

                            <button>

                                <FiFileText />

                                Transcript

                            </button>

                            <button>

                                <FiDownload />

                                Export

                            </button>

                        </div>

                    </div>

                ))

            }

        </div>

    );

}

export default TranslationHistory;