import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

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
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
} else if (!isFirebaseConfigured) {
  console.warn(
    "[Firebase] Admin SDK not configured — set FIREBASE_* in server/.env. API auth and sockets will reject tokens until configured."
  );
}

export const adminAuth = isFirebaseConfigured ? admin.auth() : null;
export default admin;
