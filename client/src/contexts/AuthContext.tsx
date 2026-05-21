import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import {
  auth,
  googleProvider,
  browserPopupRedirectResolver,
} from "../services/firebase";
import { isFirebaseConfigured } from "../utils/firebaseConfig";
import { loginWithBackend } from "../services/authService";
import { agentDebugLog } from "../utils/agentDebugLog";
import { shouldUseRedirectSignIn } from "../utils/deviceAuth";
import type { User } from "../types";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  dbUser: User | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase client environment variables are not configured");
    }
    if (shouldUseRedirectSignIn()) {
      agentDebugLog(
        "AuthContext.tsx:signInWithGoogle",
        "using redirect sign-in",
        { host: window.location.host },
        "H8"
      );
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    const result = await signInWithPopup(
      auth,
      googleProvider,
      browserPopupRedirectResolver
    );
    const token = await result.user.getIdToken();
    setIdToken(token);
    const user = await loginWithBackend();
    setDbUser(user);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setDbUser(null);
    setIdToken(null);
  }, []);

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        agentDebugLog(
          "AuthContext.tsx:getRedirectResult",
          "redirect sign-in completed",
          { uid: result.user.uid, host: window.location.host },
          "H8"
        );
        const token = await result.user.getIdToken();
        setIdToken(token);
        const user = await loginWithBackend();
        setDbUser(user);
      })
      .catch((err) => {
        console.error("[Auth] Redirect sign-in failed:", err);
        agentDebugLog(
          "AuthContext.tsx:getRedirectResult",
          "redirect sign-in failed",
          { message: err instanceof Error ? err.message : String(err) },
          "H8"
        );
      });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
        try {
          const dbUserData = await loginWithBackend();
          setDbUser(dbUserData);
        } catch (err) {
          console.error("Failed to sync user with backend", err);
          agentDebugLog(
            "AuthContext.tsx:onAuthStateChanged",
            "loginWithBackend failed",
            {
              message: err instanceof Error ? err.message : String(err),
              host: window.location.host,
            },
            "H8"
          );
        }
      } else {
        setDbUser(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Refresh token so Socket.io auth stays valid (reconnects via idToken effect)
  useEffect(() => {
    if (!firebaseUser) return;
    const refresh = async () => {
      const token = await firebaseUser.getIdToken(true);
      setIdToken(token);
    };
    const interval = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [firebaseUser]);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, dbUser, idToken, loading, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
};
