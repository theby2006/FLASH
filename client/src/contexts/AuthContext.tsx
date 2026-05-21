import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";
import { loginWithBackend } from "../services/authService";
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
    const result = await signInWithPopup(auth, googleProvider);
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
        try {
          const dbUserData = await loginWithBackend();
          setDbUser(dbUserData);
        } catch {
          console.error("Failed to sync user with backend");
        }
      } else {
        setDbUser(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Auto-refresh token every 55 minutes
  useEffect(() => {
    if (!firebaseUser) return;
    const interval = setInterval(async () => {
      const token = await firebaseUser.getIdToken(true);
      setIdToken(token);
    }, 55 * 60 * 1000);
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
