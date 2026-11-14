import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";

export function RodoBanner() {
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    const isAccepted = localStorage.getItem("purre_rodo_accepted");
    if (!isAccepted) {
      setAccepted(false);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("purre_rodo_accepted", "true");
    setAccepted(true);
  };

  if (accepted) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#1f2937",
        color: "#f3f4f6",
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 99999,
        boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
        fontSize: "14px",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ maxWidth: "800px", flex: "1 1 280px" }}>
        <span>
          Używamy plików cookies i podobnych technologii w celach świadczenia usług, statystycznych oraz RODO.
          Korzystając ze strony, wyrażasz na to zgodę.{" "}
        </span>
        <Link to="/privacy" style={{ color: "#a78bfa", textDecoration: "underline" }}>
          Polityka prywatności
        </Link>
        {" · "}
        <Link to="/terms" style={{ color: "#a78bfa", textDecoration: "underline" }}>
          Regulamin
        </Link>
      </div>
      <button
        type="button"
        onClick={handleAccept}
        style={{
          background: "#10b981",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "600",
          whiteSpace: "nowrap",
        }}
      >
        Rozumiem i akceptuję
      </button>
    </div>
  );
}

export default RodoBanner;
