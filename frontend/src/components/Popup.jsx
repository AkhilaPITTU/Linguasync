function Popup({ show, icon, title, message }) {
  if (!show) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-box">

        <div className="popup-icon">
          {icon}
        </div>

        <h2>{title}</h2>

        <p>{message}</p>

      </div>
    </div>
  );
}

export default Popup;