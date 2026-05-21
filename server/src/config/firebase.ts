import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import dotenv from "dotenv";

// Always load server/.env regardless of process cwd (e.g. repo root vs server/)
const serverRoot = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(serverRoot, ".env") });

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function resolveServiceAccountPath(): string | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!raw) return null;

  const candidates = [
    raw,
    path.isAbsolute(raw) ? raw : path.join(serverRoot, raw),
    path.join(serverRoot, "firebase-service-account.json"),
  ];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) return resolved;
  }

  return null;
}

function loadServiceAccountFromFile(): ServiceAccountJson | null {
  const resolved = resolveServiceAccountPath();
  if (!resolved) {
    console.warn(
      "[Firebase] Service account file not found. Set FIREBASE_SERVICE_ACCOUNT_PATH in server/.env or place firebase-service-account.json in server/"
    );
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(resolved, "utf8")) as ServiceAccountJson;
  } catch (err) {
    console.error("[Firebase] Failed to read service account file:", err);
    return null;
  }
}

const serviceAccountFromFile = loadServiceAccountFromFile();

const projectId =
  serviceAccountFromFile?.project_id ?? process.env.FIREBASE_PROJECT_ID;
const clientEmail =
  serviceAccountFromFile?.client_email ?? process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw =
  serviceAccountFromFile?.private_key ?? process.env.FIREBASE_PRIVATE_KEY;
const privateKey = privateKeyRaw?.replace(/\\n/g, "\n");

export const isFirebaseConfigured = Boolean(
  projectId &&
    projectId !== "your-project-id" &&
    clientEmail &&
    !clientEmail.includes("firebase-adminsdk-xxx") &&
    privateKey &&
    privateKey.includes("BEGIN PRIVATE KEY") &&
    !privateKey.includes("Your\nKey\nHere")
);

if (isFirebaseConfigured && !admin.apps.length) {
  if (serviceAccountFromFile) {
    admin.initializeApp({
      credential: admin.credential.cert(
        serviceAccountFromFile as admin.ServiceAccount
      ),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId!,
        clientEmail: clientEmail!,
        privateKey: privateKey!,
      }),
    });
  }
  console.log(`[Firebase] Admin SDK connected (project: ${projectId})`);
} else if (!isFirebaseConfigured) {
  console.warn(
    "[Firebase] Admin SDK not configured — set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_* in server/.env"
  );
}

export const adminAuth = isFirebaseConfigured ? admin.auth() : null;
export default admin;
