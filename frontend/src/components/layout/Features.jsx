import { motion } from "framer-motion";
import {
  FaMicrophoneAlt,
  FaLanguage,
  FaBrain,
  FaUserFriends,
  FaShieldAlt,
  FaFileExport,
  FaEdit,
  FaNetworkWired,
} from "react-icons/fa";

import "./Features.css";

const cardAnimation = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

function Features() {
  return (
    <section className="features">

      <motion.div
        className="features-title"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={cardAnimation}
      >
        <span>POWERFUL AI MODULES</span>

        <h2>
          Everything Needed for
          <br />
          Intelligent Speech Translation
        </h2>

        <p>
          LINGUASYNC integrates Transformer Neural Machine Translation,
          Faster-Whisper Speech Recognition, Context Memory,
          Secure Transcript Logging and Human Verification into
          one intelligent multilingual communication platform.
        </p>
      </motion.div>

      <div className="bento-grid">

        {/* Card 1 */}

        <motion.div
          className="card large"
          variants={cardAnimation}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >

          <div className="icon-box">
            <FaMicrophoneAlt />
          </div>

          <h3>Speech Recognition</h3>

          <p>
            Converts multilingual speech into high-quality text
            using Faster-Whisper with low latency.
          </p>

          <div className="wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>

        </motion.div>

        {/* Card 2 */}

        <motion.div
          className="card"
          variants={cardAnimation}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >

          <div className="icon-box">
            <FaLanguage />
          </div>

          <h3>Transformer Translation</h3>

          <div className="translation-flow">

            <span>English</span>

            ↓

            <span>Transformer</span>

            ↓

            <span>Spanish</span>

          </div>

        </motion.div>

        {/* Card 3 */}

        <motion.div
          className="card"
          variants={cardAnimation}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >

          <div className="icon-box">
            <FaBrain />
          </div>

          <h3>Context Memory</h3>

          <p>
            Maintains previous conversation history to improve
            translation consistency.
          </p>

        </motion.div>

        {/* Card 4 */}

        <motion.div
          className="card wide"
          variants={cardAnimation}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >

          <div className="icon-box">
            <FaNetworkWired />
          </div>

          <h3>Transformer Architecture</h3>

          <div className="pipeline">

            <span>Speech</span>

            →

            <span>Encoder</span>

            →

            <span>Attention</span>

            →

            <span>Decoder</span>

            →

            <span>Translation</span>

          </div>

        </motion.div>

        {/* Card 5 */}

        <motion.div
          className="card"
          variants={cardAnimation}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >

          <div className="icon-box">
            <FaUserFriends />
          </div>

          <h3>Speaker Identification</h3>

          <p>
            Detects multiple speakers and assigns transcripts
            automatically.
          </p>

        </motion.div>

        {/* Card 6 */}

        <motion.div
          className="card"
          variants={cardAnimation}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >

          <div className="icon-box">
            <FaEdit />
          </div>

          <h3>Human Correction</h3>

          <p>
            Edit generated transcripts before secure storage.
          </p>

        </motion.div>

        {/* Card 7 */}

        <motion.div
          className="card"
          variants={cardAnimation}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >

          <div className="icon-box">
            <FaShieldAlt />
          </div>

          <h3>Secure Logging</h3>

          <ul className="security-list">
            <li>✔ AES Encryption</li>
            <li>✔ SHA-256 Hash</li>
            <li>✔ Integrity Verified</li>
          </ul>

        </motion.div>

        {/* Card 8 */}

        <motion.div
          className="card"
          variants={cardAnimation}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >

          <div className="icon-box">
            <FaFileExport />
          </div>

          <h3>Export Transcript</h3>

          <p>
            Download conversations as PDF or TXT with secure
            verification.
          </p>

        </motion.div>

      </div>

    </section>
  );
}

export default Features;