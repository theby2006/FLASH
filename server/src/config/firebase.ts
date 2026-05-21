import fs from "fs";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

function loadServiceAccountFromFile(): ServiceAccountJson | null {
  if (!serviceAccountPath) return null;
  try {
    const resolved = serviceAccountPath.startsWith("/")
      ? serviceAccountPath
      : `${process.cwd()}/${serviceAccountPath}`;
    if (!fs.existsSync(resolved)) {
      console.warn(`[Firebase] Service account file not found: ${resolved}`);
      return null;
    }
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
const privateKey = (
  serviceAccountFromFile?.private_key ??
  process.env.FIREBASE_PRIVATE_KEY
)?.replace(/\\n/g, "\n");

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
