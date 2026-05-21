/** Allowed browser origins for API + Socket.io */

const LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/;

function parseClientOrigins(): string[] {
  const raw =
    process.env.CLIENT_URLS ??
    process.env.CLIENT_URL ??
    "http://localhost:5173";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const allowedOrigins = parseClientOrigins();

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production" && LAN_ORIGIN.test(origin)) {
    return true;
  }
  return false;
}

export const corsOriginDelegate = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`CORS blocked origin: ${origin}`));
  }
};

export const corsOptions = {
  origin: corsOriginDelegate,
  credentials: true,
};
