import React, { useState, useCallback } from "react";
import { searchUserByEmail, sendFriendRequest } from "../../services/userService";
import { User } from "../../types";
import Avatar from "../ui/Avatar";
import Spinner from "../ui/Spinner";

const SearchBar: React.FC = () => {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = useCallback(async () => {
    if (!email.trim()) return;
    setLoading(true);
    setResult(undefined);
    setRequestSent(false);
    setError("");
    try {
      const user = await searchUserByEmail(email.trim());
      setResult(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSendRequest = async () => {
    if (!result) return;
    try {
      await sendFriendRequest(result.id);
      setRequestSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send request");
    }
  };

  return (
    <div className="search-bar">
      <div className="search-input-row">
        <input
          id="user-search-input"
          className="search-input"
          type="email"
          placeholder="Search by email address…"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search users by email"
        />
        <button
          id="user-search-btn"
          className="search-btn"
          onClick={handleSearch}
          disabled={loading || !email.trim()}
          aria-label="Search"
        >
          {loading ? <Spinner size="sm" /> : "Search"}
        </button>
      </div>

      {error && <p className="search-error">{error}</p>}

      {result === null && (
        <p className="search-no-result">No user found with that email.</p>
      )}

      {result && (
        <div className="search-result-card">
          <Avatar
            src={result.photoURL}
            name={result.displayName}
            size="md"
          />
          <div className="search-result-info">
            <span className="search-result-name">{result.displayName}</span>
            <span className="search-result-email">{result.email}</span>
          </div>
          <button
            id="send-request-btn"
            className={`send-request-btn ${requestSent ? "sent" : ""}`}
            onClick={handleSendRequest}
            disabled={requestSent}
          >
            {requestSent ? "✓ Sent" : "Add Contact"}
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
