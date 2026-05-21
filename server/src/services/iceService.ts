/** ICE servers for WebRTC — STUN for discovery, TURN for cross-network relay */

export type IceServerDto = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const GOOGLE_STUN: IceServerDto[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

/** Public dev TURN (Metered OpenRelay) — enables phone ↔ laptop on different networks */
const DEV_OPENRELAY_TURN: IceServerDto = {
  urls: [
    "turn:openrelay.metered.ca:80",
    "turn:openrelay.metered.ca:443",
    "turn:openrelay.metered.ca:443?transport=tcp",
    "turns:openrelay.metered.ca:443",
  ],
  username: "openrelayproject",
  credential: "openrelayproject",
};

function parseTurnUrls(raw: string): string | string[] {
  const urls = raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  return urls.length === 1 ? urls[0] : urls;
}

export function getIceServers(): IceServerDto[] {
  const servers: IceServerDto[] = [...GOOGLE_STUN];

  const turnUrl = process.env.TURN_URL;
  const turnUser = process.env.TURN_USERNAME;
  const turnCred = process.env.TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: parseTurnUrls(turnUrl),
      username: turnUser,
      credential: turnCred,
    });
    return servers;
  }

  const useDevTurn =
    process.env.ENABLE_DEV_TURN === "true" ||
    process.env.NODE_ENV !== "production";

  if (useDevTurn) {
    servers.push(DEV_OPENRELAY_TURN);
  }

  return servers;
}

export function isTurnConfigured(): boolean {
  return !!(
    process.env.TURN_URL &&
    process.env.TURN_USERNAME &&
    process.env.TURN_CREDENTIAL
  );
}
