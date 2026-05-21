import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  browserPopupRedirectResolver,
} from "firebase/auth";
import { isFirebaseConfigured } from "../utils/firebaseConfig";

export { browserPopupRedirectResolver };

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!isFirebaseConfigured()) {
  console.error(
    "[FLASH] Firebase client config is incomplete. Update client/.env with values from Firebase Console → Project settings → Your apps → Web app."
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
