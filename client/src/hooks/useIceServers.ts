import { useEffect, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { fetchIceServers } from "../services/callService";
import { ICE_SERVERS } from "../utils/constants";

/**
 * Loads STUN/TURN from the server (required for calls between different devices/networks).
 */
export function useIceServers() {
  const { idToken } = useAuthContext();
  const [iceServers, setIceServers] = useState<RTCIceServer[]>(ICE_SERVERS);
  const [turnReady, setTurnReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!idToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchIceServers()
      .then(({ iceServers: servers, turnConfigured }) => {
        if (cancelled) return;
        setIceServers(servers);
        setTurnReady(turnConfigured || servers.length > 3);
        console.log(
          "[Call] ICE servers loaded",
          turnConfigured ? "(custom TURN)" : "(STUN + dev TURN relay)"
        );
      })
      .catch((err) => {
        console.warn("[Call] Using fallback ICE servers:", err);
        if (!cancelled) setIceServers(ICE_SERVERS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idToken]);

  return { iceServers, turnReady, loading };
}
