import React, { useEffect } from "react";
import { useChatStore } from "../../store/useChatStore";
import { getConversations } from "../../services/chatService";
import ContactItem from "./ContactItem";
import { useFriendRequests } from "../../hooks/useFriendRequests";
import FriendRequestCard from "./FriendRequestCard";

interface ContactListProps {
  onSelectConversation: (id: string) => void;
}

const ContactList: React.FC<ContactListProps> = ({ onSelectConversation }) => {
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
  } = useChatStore();
  const { pendingRequests } = useFriendRequests();

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch(console.error);
  }, [setConversations]);

  const handleSelect = (id: string) => {
    setActiveConversationId(id);
    onSelectConversation(id);
  };

  return (
    <div className="contact-list">
      {pendingRequests.length > 0 && (
        <div className="contact-list-section">
          <p className="contact-list-section-title">
            Requests ({pendingRequests.length})
          </p>
          {pendingRequests.map((req) => (
            <FriendRequestCard key={req.id} request={req} />
          ))}
        </div>
      )}

      <div className="contact-list-section">
        <p className="contact-list-section-title">Messages</p>
        {conversations.length === 0 ? (
          <div className="contact-list-empty">
            <span>No conversations yet.</span>
            <span>Search for a contact above.</span>
          </div>
        ) : (
          conversations.map((conv) => (
            <ContactItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              onClick={() => handleSelect(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ContactList;
