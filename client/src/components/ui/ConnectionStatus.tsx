import React from "react";

interface ConnectionStatusProps {
  connected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected }) => (
  <span
    className={`connection-status ${connected ? "live" : "reconnecting"}`}
    title={connected ? "Real-time connected" : "Reconnecting…"}
  >
    <span className="connection-dot" aria-hidden />
    {connected ? "Live" : "Reconnecting…"}
  </span>
);

export default ConnectionStatus;
