import { motion } from "framer-motion";
import {
  FaArrowRight,
  FaMicrophone,
  FaLanguage,
  FaShieldAlt,
  FaBrain,
} from "react-icons/fa";
import { Link } from "react-router-dom";

import "./Hero.css";

function Hero() {
  return (
    <section className="hero">

      {/* ================= LEFT ================= */}

      <motion.div
        className="hero-left"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >

        <span className="hero-tag">
          🚀 IEEE Transformer-Based Speech Translation
        </span>

        <h1>
          Break Every
          <br />
          <span>Language Barrier</span>
        </h1>

        <p>
          LINGUASYNC is a Transformer-based multilingual speech translation
          platform that enables seamless communication through Speech
          Recognition, Transformer Neural Machine Translation,
          Context Awareness, Multi-Head Attention and Secure Transcript
          Logging.
        </p>

        <div className="hero-buttons">

          <Link to="/register" className="primary-btn">
            Get Started
            <FaArrowRight />
          </Link>

          <Link to="/login" className="secondary-btn">
            Log in
          </Link>

        </div>

        <div className="hero-features">

          <div>
            <FaMicrophone />
            <span>Speech Recognition</span>
          </div>

          <div>
            <FaBrain />
            <span>Transformer Translation</span>
          </div>

          <div>
            <FaLanguage />
            <span>Context Awareness</span>
          </div>

          <div>
            <FaShieldAlt />
            <span>Secure Logging</span>
          </div>

        </div>

      </motion.div>

      {/* ================= RIGHT ================= */}

      <motion.div
        className="hero-right"
        animate={{ y: [0, -15, 0] }}
        transition={{
          repeat: Infinity,
          duration: 4,
        }}
      >

        <div className="mockup">

          <div className="video-card">

            <div className="meeting-header">

              <div className="live-dot"></div>

              <span>Live Transformer Translation</span>

            </div>

            <div className="speaker">

              <h3>🎤 Speaker 01</h3>

              <small>English</small>

            </div>

            <div className="speech-box">

              <h4>Input Speech</h4>

              <p>
                Good morning everyone.
                Welcome to today's meeting.
              </p>

            </div>

            <div className="process-flow">

              ↓ Speech Recognition

              <br />

              ↓ Transformer Translation

              <br />

              ↓ Context Awareness

              <br />

              ↓ Attention Mechanism

            </div>

            <div className="translation-box">

              <h4>Translated Output (Spanish)</h4>

              <p>
                Buenos días a todos.
                Bienvenidos a la reunión.
              </p>

            </div>

          </div>

          {/* Floating Cards */}

          <div className="floating-card card1">
            🔄 Transformer Encoder
          </div>

          <div className="floating-card card2">
            🧠 Multi-Head Attention
          </div>

          <div className="floating-card card3">
            📚 Context Awareness
          </div>

          <div className="floating-card card4">
            🔒 Secure Logging
          </div>

        </div>

      </motion.div>

    </section>
  );
}

export default Hero;
