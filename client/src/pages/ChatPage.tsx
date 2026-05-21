import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSocketContext } from "../contexts/SocketContext";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useChatStore } from "../store/useChatStore";
import ContactList from "../components/contacts/ContactList";
import ConnectionStatus from "../components/ui/ConnectionStatus";
import SearchBar from "../components/contacts/SearchBar";
import ChatWindow from "../components/chat/ChatWindow";
import GroupList from "../components/groups/GroupList";
import GroupInfoPanel from "../components/groups/GroupInfoPanel";
import Avatar from "../components/ui/Avatar";
import Spinner from "../components/ui/Spinner";

const ChatPage: React.FC = () => {
  const { dbUser, signOut, loading } = useAuth();
  const { conversations, activeConversationId, setActiveConversationId } =
    useChatStore();
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const { connected } = useAutoRefresh();
  const socketError = useSocketContext().socketError;

  useEffect(() => {
    const totalUnread = conversations.reduce(
      (sum, c) => sum + (c.unreadCount ?? 0),
      0
    );
    document.title =
      totalUnread > 0 ? `(${totalUnread}) FLASH — Chat` : "FLASH — Chat";
    return () => {
      document.title = "FLASH — Chat";
    };
  }, [conversations]);

  if (loading) {
    return (
      <div className="full-screen-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!dbUser) {
    return <Navigate to="/login" replace />;
  }

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${activeConversationId ? "mobile-hidden" : ""}`}>
        <header className="sidebar-header">
          <div className="user-profile">
            <Avatar src={dbUser.photoURL} name={dbUser.displayName} size="md" />
            <div className="user-profile-text">
              <span className="user-name">{dbUser.displayName}</span>
              <ConnectionStatus connected={connected} error={socketError} />
            </div>
          </div>
          <button className="logout-btn" onClick={signOut} aria-label="Sign out">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </header>

        <div className="sidebar-search">
          <SearchBar />
        </div>

        <div className="sidebar-actions">
          <GroupList />
        </div>

        <div className="sidebar-scrollable">
          <ContactList
            onSelectConversation={() => setShowGroupInfo(false)}
          />
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={`chat-main ${!activeConversationId ? "mobile-hidden" : ""}`}>
        {activeConversation ? (
          <div className="chat-container">
            <button
              type="button"
              className="mobile-back-btn"
              onClick={() => setActiveConversationId(null)}
              aria-label="Back to conversations"
            >
              ← Chats
            </button>
            <ChatWindow
              conversation={activeConversation}
              onInfoClick={() => setShowGroupInfo(!showGroupInfo)}
            />
            {showGroupInfo && activeConversation.isGroup && (
              <GroupInfoPanel
                conversation={activeConversation}
                onClose={() => setShowGroupInfo(false)}
              />
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <h2>Welcome to FLASH</h2>
            <p>Select a conversation or search for a friend to start chatting.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatPage;
