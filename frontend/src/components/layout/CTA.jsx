import "./CTA.css";
import { FaArrowRight } from "react-icons/fa";
import { MdMeetingRoom } from "react-icons/md";
import { Link } from "react-router-dom";

export default function CTA() {
  return (
    <section className="cta">

      <div className="cta-card">

        <span className="cta-badge">
          🚀 Start Your Experience
        </span>

        <h2>
          Break Language Barriers with
          <span> LINGUASYNC</span>
        </h2>

        <p>
          Experience real-time multilingual communication powered by
          Transformer AI. Create secure meeting rooms, translate speech
          instantly, and export verified transcripts with ease.
        </p>

        <div className="cta-buttons">

          <Link to="/create-room" className="primary-btn">

            <MdMeetingRoom />

            Create Meeting

          </Link>

          <Link to="/join-room" className="secondary-btn">

            Join Meeting

            <FaArrowRight />

          </Link>

        </div>

      </div>

    </section>
  );
}