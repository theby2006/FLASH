import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import Spinner from "../components/ui/Spinner";

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
