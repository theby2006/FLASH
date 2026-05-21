import React from "react";

interface ConnectionStatusProps {
  connected: boolean;
  error?: string | null;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connected,
  error,
}) => (
  <span
    className={`connection-status ${connected ? "live" : "reconnecting"}`}
    title={
      connected
        ? "Real-time connected"
        : error
          ? `Connection error: ${error}`
          : "Reconnecting…"
    }
  >
    <span className="connection-dot" aria-hidden />
    {connected ? "Live" : error ? "Offline" : "Reconnecting…"}
  </span>
);

export default ConnectionStatus;
