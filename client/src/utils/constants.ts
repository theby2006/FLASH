/** In dev, use same-origin + Vite proxy unless VITE_* overrides are set */
const isDev = import.meta.env.DEV;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (isDev ? "" : "http://localhost:5001");

/** undefined = connect to current host (proxied /socket.io in dev) */
export const SOCKET_URL: string | undefined =
  import.meta.env.VITE_SOCKET_URL ||
  (isDev ? undefined : "http://localhost:5001");

export const MESSAGE_LIMIT = 30;

export const TYPING_DEBOUNCE_MS = 1500;

/** Poll when socket is connected (backup sync, ms) */
export const AUTO_REFRESH_INTERVAL_CONNECTED_MS = 45_000;

/** Poll more often when socket is down (ms) */
export const AUTO_REFRESH_INTERVAL_DISCONNECTED_MS = 10_000;

/** Debounce refresh when tab becomes visible again */
export const VISIBILITY_REFRESH_DEBOUNCE_MS = 500;

/** Ring / no-answer timeout (ms) */
export const CALL_RING_TIMEOUT_MS = 45_000;

function buildFallbackIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;
  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl.split(",").map((u) => u.trim()),
      username: turnUser,
      credential: turnCred,
    });
  }

  return servers;
}

/** Fallback until GET /api/calls/ice-servers loads (prefer server TURN config) */
export const ICE_SERVERS = buildFallbackIceServers();
