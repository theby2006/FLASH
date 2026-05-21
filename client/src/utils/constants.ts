/** In dev, use same-origin + Vite proxy unless VITE_* overrides are set */
const isDev = import.meta.env.DEV;

function lanBackendOrigin(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return null;
  const port = import.meta.env.VITE_DEV_API_PORT ?? "5001";
  return `http://${host}:${port}`;
}

const lanApi = lanBackendOrigin();

const envApi = import.meta.env.VITE_API_BASE_URL?.trim() || undefined;
const envSocket = import.meta.env.VITE_SOCKET_URL?.trim() || undefined;

/**
 * LAN hostname wins over VITE_* — never use localhost:5001 from .env on a phone
 * opened at http://192.168.x.x:5173 (that would target the phone itself).
 */
export const API_BASE_URL =
  lanApi ?? envApi ?? (isDev ? "" : "http://localhost:5001");

/** undefined = same-origin + Vite /socket.io proxy on localhost dev */
export const SOCKET_URL: string | undefined =
  lanApi ?? envSocket ?? (isDev ? undefined : "http://localhost:5001");

export const MESSAGE_LIMIT = 30;

export const TYPING_DEBOUNCE_MS = 1500;

/** Poll when socket is connected (backup sync, ms) */
export const AUTO_REFRESH_INTERVAL_CONNECTED_MS = 15_000;

/** Fast sync for open chat when realtime may lag (ms) */
export const ACTIVE_CHAT_SYNC_MS = 2_500;

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
      urls: turnUrl.split(",").map((u: string) => u.trim()),
      username: turnUser,
      credential: turnCred,
    });
  }

  return servers;
}

/** Fallback until GET /api/calls/ice-servers loads (prefer server TURN config) */
export const ICE_SERVERS = buildFallbackIceServers();
