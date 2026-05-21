import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  return (
    <div className="full-screen-center">
      <div className="not-found">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary" style={{ display: "inline-block", marginTop: "1rem" }}>
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
