import React, { useState, useEffect } from "react";

export const RodoBanner = () => {
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
    <div style={{
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
      fontSize: "14px"
    }}>
      <div style={{ maxWidth: "800px" }}>
        <span>Używamy plików cookies i podobnych technologii w celach świadczenia usług, statystycznych oraz RODO. Korzystając ze strony, wyrażasz na to zgodę.</span>
      </div>
      <button 
        onClick={handleAccept}
        style={{
          background: "#10b981",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "600",
          marginLeft: "16px"
        }}
      >
        Rozumiem i akceptuję
      </button>
    </div>
  );
};
