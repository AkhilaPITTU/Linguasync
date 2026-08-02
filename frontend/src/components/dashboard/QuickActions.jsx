import "./QuickActions.css";

import {
  FiPhone,
  FiVideo,
  FiMic,
  FiUpload,
  FiDownload,
  FiUsers,
  FiMessageSquare,
  FiGlobe
} from "react-icons/fi";

function QuickActions() {

  const actions = [

    {
      id: 1,
      title: "Start Call",
      subtitle: "Audio or Video",
      icon: <FiPhone />,
      color: "#7C3AED"
    },

    {
      id: 2,
      title: "Join Call",
      subtitle: "Enter Call Room",
      icon: <FiUsers />,
      color: "#2563EB"
    },

    {
      id: 3,
      title: "Translate Speech",
      subtitle: "Real-Time Voice",
      icon: <FiMic />,
      color: "#22C55E"
    },

    {
      id: 4,
      title: "Translate Text",
      subtitle: "Multi Language",
      icon: <FiGlobe />,
      color: "#06B6D4"
    },

    {
      id: 5,
      title: "Upload Audio",
      subtitle: "Speech Translation",
      icon: <FiUpload />,
      color: "#F59E0B"
    },

    {
      id: 6,
      title: "Export Transcript",
      subtitle: "PDF / DOCX / TXT",
      icon: <FiDownload />,
      color: "#EF4444"
    }

  ];

  const handleAction = (action) => {

    switch(action){

      case "Start Call":
        alert("Choose Audio or Video Call");
        break;

      case "Join Call":
        alert("Open Join Call Screen");
        break;

      case "Translate Speech":
        alert("Speech Translation");
        break;

      case "Translate Text":
        alert("Text Translation");
        break;

      case "Upload Audio":
        alert("Upload Audio File");
        break;

      case "Export Transcript":
        alert("Export Transcript");
        break;

      default:
        break;

    }

  };

  return (

    <div className="dashboard-card quick-actions">

      <div className="card-header">

        <h2>Quick Actions</h2>

        <span>6 Actions</span>

      </div>

      <div className="actions-grid">

        {

          actions.map((action)=>(

            <button

              key={action.id}

              className="action-card"

              onClick={() => handleAction(action.title)}

            >

              <div

                className="action-icon"

                style={{

                  background: action.color

                }}

              >

                {action.icon}

              </div>

              <h3>

                {action.title}

              </h3>

              <p>

                {action.subtitle}

              </p>

            </button>

          ))

        }

      </div>

    </div>

  );

}

export default QuickActions;