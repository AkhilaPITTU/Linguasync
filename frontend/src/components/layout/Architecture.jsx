import "./Architecture.css";

import {
  FaMicrophone,
  FaLanguage,
  FaBrain,
  FaProjectDiagram,
  FaUsers,
  FaShieldAlt,
  FaFileExport,
} from "react-icons/fa";

import { MdTranslate, MdEditDocument } from "react-icons/md";

const architecture = [
  {
    icon: <FaMicrophone />,
    title: "Speech Input",
    desc: "Capture multilingual speech from meeting participants."
  },
  {
    icon: <MdTranslate />,
    title: "Faster Whisper",
    desc: "Convert speech into highly accurate real-time text."
  },
  {
    icon: <FaBrain />,
    title: "Transformer Encoder",
    desc: "Extract semantic meaning from the spoken sentence."
  },
  {
    icon: <FaProjectDiagram />,
    title: "Multi-Head Attention",
    desc: "Understand context using multiple attention heads."
  },
  {
    icon: <FaLanguage />,
    title: "Transformer Decoder",
    desc: "Generate natural translation in the selected language."
  },
  {
    icon: <FaUsers />,
    title: "Context Memory",
    desc: "Maintain previous conversation context for better accuracy."
  },
  {
    icon: <MdEditDocument />,
    title: "Transcript Editing",
    desc: "Allow users to review and edit translated transcripts."
  },
  {
    icon: <FaShieldAlt />,
    title: "AES + SHA-256",
    desc: "Secure transcripts with encryption and integrity verification."
  },
  {
    icon: <FaFileExport />,
    title: "Export",
    desc: "Download verified transcripts in PDF or TXT format."
  },
];

export default function Architecture() {
  return (
    <section className="architecture">

      <div className="architecture-title">

        <span>System Architecture</span>

        <h2>
          How <span>LINGUASYNC</span> Works
        </h2>

        <p>
          Our Transformer-powered multilingual communication pipeline converts
          live speech into secure, context-aware translations in real time.
        </p>

      </div>

      <div className="architecture-flow">

        {architecture.map((item, index) => (
          <div className="flow-item" key={index}>

            <div className="flow-icon">
              {item.icon}
            </div>

            <h3>{item.title}</h3>

            <p>{item.desc}</p>

            {index !== architecture.length - 1 && (
              <div className="arrow">
                ↓
              </div>
            )}

          </div>
        ))}

      </div>

    </section>
  );
}