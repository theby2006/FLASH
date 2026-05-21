import React from "react";
import { useChatStore } from "../../store/useChatStore";
import { getOrCreateDM } from "../../services/chatService";
import ContactItem from "./ContactItem";
import { useFriendRequests } from "../../hooks/useFriendRequests";
import FriendRequestCard from "./FriendRequestCard";
import Avatar from "../ui/Avatar";

interface ContactListProps {
  onSelectConversation: (id: string) => void;
}

const ContactList: React.FC<ContactListProps> = ({ onSelectConversation }) => {
  const {
    conversations,
    contacts,
    activeConversationId,
    setActiveConversationId,
    addConversation,
    onlineUsers,
  } = useChatStore();
  const { pendingRequests, acceptRequest, rejectRequest } = useFriendRequests();

  const handleSelect = (id: string) => {
    setActiveConversationId(id);
    onSelectConversation(id);
  };

  const openDmWithFriend = async (friendId: string) => {
    try {
      const conv = await getOrCreateDM(friendId);
      addConversation(conv);
      handleSelect(conv.id);
    } catch (err) {
      console.error(err);
    }
  };

  const friendsWithoutChat = contacts.filter(
    (c) =>
      !conversations.some(
        (conv) =>
          !conv.isGroup &&
          conv.members.some((m) => m.userId === c.id)
      )
  );

  return (
    <div className="contact-list">
      {pendingRequests.length > 0 && (
        <div className="contact-list-section">
          <p className="contact-list-section-title">
            Requests ({pendingRequests.length})
          </p>
          {pendingRequests.map((req) => (
            <FriendRequestCard
              key={req.id}
              request={req}
              onAccept={acceptRequest}
              onReject={rejectRequest}
            />
          ))}
        </div>
      )}

      {friendsWithoutChat.length > 0 && (
        <div className="contact-list-section">
          <p className="contact-list-section-title">Contacts</p>
          {friendsWithoutChat.map((user) => (
            <button
              key={user.id}
              type="button"
              className="contact-item"
              onClick={() => openDmWithFriend(user.id)}
              aria-label={`Message ${user.displayName}`}
            >
              <Avatar
                src={user.photoURL}
                name={user.displayName}
                size="md"
                isOnline={onlineUsers.has(user.id)}
              />
              <div className="contact-item-info">
                <span className="contact-item-name">{user.displayName}</span>
                <span className="contact-item-last-msg">Tap to message</span>
              </div>
            </button>
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
