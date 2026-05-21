import React, { useEffect, useState } from "react";
import { API_BASE_URL, SOCKET_URL } from "../../utils/constants";
import { isLanDevHost } from "../../utils/deviceAuth";
import api from "../../services/api";

interface DevInfo {
  shareUrl: string | null;
  onlineUserIds: string[];
}

const LanDevBanner: React.FC = () => {
  const [info, setInfo] = useState<DevInfo | null>(null);

  useEffect(() => {
    api
      .get<DevInfo>("/debug/dev-info")
      .then((res) => setInfo(res.data))
      .catch(() => {});
  }, []);

  const onLan = isLanDevHost();
  const socketTarget = SOCKET_URL ?? window.location.origin;

  if (!onLan && !info?.shareUrl) return null;

  return (
    <div className="lan-dev-banner" role="status">
      {info?.shareUrl && !onLan && (
        <p>
          <strong>Phone / tablet:</strong> open{" "}
          <code>{info.shareUrl}</code> (same Wi‑Fi, different Google account).
        </p>
      )}
      {onLan && (
        <p>
          <strong>LAN mode</strong> — API: <code>{API_BASE_URL}</code>, socket:{" "}
          <code>{socketTarget}</code>
        </p>
      )}
      {onLan && (
        <p className="lan-dev-banner-hint">
          In Firebase Console → Authentication → Settings → Authorized domains,
          add <code>{window.location.hostname}</code> if Google sign-in fails.
        </p>
      )}
      {info && info.onlineUserIds.length > 0 && (
        <p>
          Realtime online ({info.onlineUserIds.length}):{" "}
          {info.onlineUserIds.map((id) => id.slice(0, 8)).join(", ")}
        </p>
      )}
    </div>
  );
};

export default LanDevBanner;
