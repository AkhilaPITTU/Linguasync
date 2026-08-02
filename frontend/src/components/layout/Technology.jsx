import "./Technology.css";

import {
  FaReact,
  FaPython,
  FaDocker,
  FaNodeJs,
  FaDatabase,
} from "react-icons/fa";

import {
  SiVite,
  SiFastapi,
  SiMongodb,
  SiWebrtc,
  SiTensorflow,
} from "react-icons/si";

import { MdSecurity } from "react-icons/md";

const technologies = [
  {
    icon: <FaReact />,
    title: "React 19",
    desc: "Modern responsive frontend",
  },
  {
    icon: <SiVite />,
    title: "Vite",
    desc: "Fast development environment",
  },
  {
    icon: <SiFastapi />,
    title: "FastAPI",
    desc: "High-performance backend",
  },
  {
    icon: <SiMongodb />,
    title: "MongoDB",
    desc: "Database for transcripts",
  },
  {
    icon: <SiWebrtc />,
    title: "WebRTC",
    desc: "Real-time communication",
  },
  {
    icon: <FaNodeJs />,
    title: "Socket.IO",
    desc: "Instant synchronization",
  },
  {
    icon: <FaPython />,
    title: "Python",
    desc: "AI processing engine",
  },
  {
    icon: <SiTensorflow />,
    title: "Transformer AI",
    desc: "Multilingual translation",
  },
  {
    icon: <MdSecurity />,
    title: "AES + SHA-256",
    desc: "Secure transcript storage",
  },
  {
    icon: <FaDatabase />,
    title: "Context Memory",
    desc: "Conversation awareness",
  },
  {
    icon: <FaDocker />,
    title: "Docker",
    desc: "Future deployment",
  },
];

export default function Technology() {
  return (
    <section className="technology">

      <div className="technology-title">

        <span>Technology Stack</span>

        <h2>Powered By Modern Technologies</h2>

        <p>
          LINGUASYNC combines modern web technologies with Transformer-based AI
          to provide secure multilingual communication.
        </p>

      </div>

      <div className="technology-grid">

        {technologies.map((tech, index) => (
          <div className="technology-card" key={index}>

            <div className="technology-icon">
              {tech.icon}
            </div>

            <h3>{tech.title}</h3>

            <p>{tech.desc}</p>

          </div>
        ))}

      </div>

    </section>
  );
}