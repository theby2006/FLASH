import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import NotFoundPage from "./pages/NotFoundPage";
import Spinner from "./components/ui/Spinner";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dbUser, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="full-screen-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!dbUser) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const AppRoutes = () => {
  const { dbUser, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="full-screen-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={dbUser ? "/chat" : "/login"} replace />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <SocketProvider>
              <ChatPage />
            </SocketProvider>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
