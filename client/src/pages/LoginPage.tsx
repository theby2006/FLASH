import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import Spinner from "../components/ui/Spinner";
import {
  getFirebaseConfigIssues,
  isFirebaseConfigured,
} from "../utils/firebaseConfig";

const LoginPage: React.FC = () => {
  const { dbUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="full-screen-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Redirect to chat if already logged in
  if (dbUser) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          ⚡<span className="logo-text">FLASH</span>
        </div>
        <h1 className="login-title">Welcome to Flash</h1>
        <p className="login-subtitle">
          Real-time messaging, group chats, and instant connection.
        </p>

        {!isFirebaseConfigured() && (
          <div className="login-config-warning" role="alert">
            <strong>Firebase not configured</strong>
            <p>
              Google sign-in needs real values in <code>client/.env</code> from
              Firebase Console → Project settings → Your apps (Web).
            </p>
            <ul>
              {getFirebaseConfigIssues().map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <p className="login-config-note">
              The OAuth client ID/secret alone are not enough — use the full
              Firebase web config (<code>VITE_FIREBASE_*</code>).
            </p>
          </div>
        )}

        <div className="login-action">
          <GoogleSignInButton />
        </div>

        <p className="login-terms">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
