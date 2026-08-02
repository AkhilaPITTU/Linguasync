import "./StatsCards.css";
import { useEffect, useState } from "react";
import { getDashboardStatistics } from "../../services/dashboardService";

import {
  FiPhone,
  FiVideo,
  FiMic,
  FiGlobe,
  FiTrendingUp,
} from "react-icons/fi";

function StatsCards() {
  const [stats, setStats] = useState({
    total_calls: 0,
    video_calls: 0,
    audio_calls: 0,
    translations: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStatistics();

        setStats(data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: "Total Calls",
      value: stats.total_calls,
      icon: <FiPhone />,
      growth: "+15%",
      color: "#7C3AED",
    },
    {
      title: "Video Calls",
      value: stats.video_calls,
      icon: <FiVideo />,
      growth: "+8%",
      color: "#2563EB",
    },
    {
      title: "Audio Calls",
      value: stats.audio_calls,
      icon: <FiMic />,
      growth: "+12%",
      color: "#22C55E",
    },
    {
      title: "Translations",
      value: stats.translations,
      icon: <FiGlobe />,
      growth: "+28%",
      color: "#F59E0B",
    },
  ];

  return (
    <div className="stats-section">
      {cards.map((item, index) => (
        <div key={index} className="stat-card">
          <div
            className="stat-icon"
            style={{ background: item.color }}
          >
            {item.icon}
          </div>

          <div className="stat-content">
            <span>{item.title}</span>

            <h2>{item.value}</h2>

            <p>
              <FiTrendingUp />
              {item.growth} this month
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;