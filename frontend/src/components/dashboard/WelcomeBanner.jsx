import "./WelcomeBanner.css";

import {
  FiPhone,
  FiGlobe,
  FiCalendar,
  FiArrowRight,
  FiCpu,
  FiActivity
} from "react-icons/fi";

function WelcomeBanner() {

  const user =
    JSON.parse(localStorage.getItem("user")) || {};

  return (

    <section className="welcome-banner">

      {/* LEFT */}

      <div className="banner-left">

        <span className="banner-badge">

          🟢 Transformer AI Ready

        </span>

        <h1>

          Welcome back,

          <span>

            {user.full_name || "AN Reddy"}

          </span>

        </h1>

        <p>

          Start multilingual audio and video communication
          powered by Transformer-based speech translation,
          live transcripts and secure conversation logging.

        </p>

        <div className="banner-buttons">

          <button className="call-btn">

            <FiPhone />

            Start Call

          </button>

          <button>

            <FiGlobe />

            Translate

          </button>

          <button>

            <FiCalendar />

            Schedule

          </button>

        </div>

      </div>

      {/* RIGHT */}

      <div className="banner-right">

        <div className="engine-header">

          <FiCpu />

          <span>

            AI Translation Engine

          </span>

        </div>

        <div className="engine-stats">

          <div>

            <h2>98.7%</h2>

            <small>Accuracy</small>

          </div>

          <div>

            <h2>38 ms</h2>

            <small>Latency</small>

          </div>

        </div>

        <div className="language-card">

          <span>

            English

          </span>

          <FiArrowRight />

          <span>

            Telugu

          </span>

        </div>

        <div className="engine-status">

          <FiActivity />

          Engine Running

        </div>

      </div>

    </section>

  );

}

export default WelcomeBanner;