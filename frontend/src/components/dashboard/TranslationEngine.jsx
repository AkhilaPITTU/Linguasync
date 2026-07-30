import "./TranslationEngine.css";

import { useEffect, useState } from "react";

import { getTranslationEngine } from "../../services/translationEngineService";

import {
    FiCpu,
    FiActivity,
    FiGlobe,
    FiZap,
    FiCheckCircle,
    FiMic
} from "react-icons/fi";

function TranslationEngine() {

    const [engine, setEngine] = useState({

        model: "",

        speech_to_text: "",

        translation: "",

        grammar: "",

        voice_clone: "",

        latency: "",

        accuracy: "",

        languages: 0

    });

    useEffect(() => {

        async function fetchEngine() {

            try {

                const data = await getTranslationEngine();

                setEngine(data);

            }

            catch (error) {

                console.error("Translation Engine Error:", error);

            }

        }

        fetchEngine();

    }, []);

    return (

        <div className="dashboard-card translation-engine">

            <div className="card-header">

                <h2>

                    Translation Engine

                </h2>

                <span>

                    LIVE

                </span>

            </div>

            <div className="engine-item">

                <FiCpu />

                <div>

                    <small>

                        AI Model

                    </small>

                    <h4>

                        {engine.model}

                    </h4>

                </div>

            </div>

            <div className="engine-item">

                <FiMic />

                <div>

                    <small>

                        Speech To Text

                    </small>

                    <h4>

                        {engine.speech_to_text}

                    </h4>

                </div>

            </div>

            <div className="engine-item">

                <FiCheckCircle />

                <div>

                    <small>

                        Translation Model

                    </small>

                    <h4>

                        {engine.translation}

                    </h4>

                </div>

            </div>

            <div className="engine-item">

                <FiZap />

                <div>

                    <small>

                        Latency

                    </small>

                    <h4>

                        {engine.latency}

                    </h4>

                </div>

            </div>

            <div className="engine-item">

                <FiGlobe />

                <div>

                    <small>

                        Languages Supported

                    </small>

                    <h4>

                        {engine.languages}

                    </h4>

                </div>

            </div>

            <div className="engine-item">

                <FiCheckCircle />

                <div>

                    <small>

                        Accuracy

                    </small>

                    <h4>

                        {engine.accuracy}

                    </h4>

                </div>

            </div>

            <div className="engine-item">

                <FiCpu />

                <div>

                    <small>

                        Voice Clone

                    </small>

                    <h4>

                        {engine.voice_clone}

                    </h4>

                </div>

            </div>

            <div className="engine-item">

                <FiCheckCircle />

                <div>

                    <small>

                        Grammar Correction

                    </small>

                    <h4>

                        {engine.grammar}

                    </h4>

                </div>

            </div>

            <div className="engine-status">

                <FiActivity />

                Healthy

            </div>

        </div>

    );

}

export default TranslationEngine;