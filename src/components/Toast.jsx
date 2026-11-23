
import { useEffect } from "react";
import "../css/Toast.css";

function Toast({ type = "error", title, message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`} role="status">
      <span className="toast-icon" aria-hidden="true">
        {type === "success" ? "✓" : type === "warning" ? "!" : "!"}
      </span>
      

      <div className="toast-content">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>

      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export default Toast;
