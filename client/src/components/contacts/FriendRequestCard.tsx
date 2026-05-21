import React, { useState } from "react";
import type { FriendRequest } from "../../types";
import Avatar from "../ui/Avatar";
import { useFriendRequests } from "../../hooks/useFriendRequests";
import { useChatStore } from "../../store/useChatStore";
import { getOrCreateDM } from "../../services/chatService";
import { getContacts } from "../../services/userService";

const FriendRequestCard: React.FC<{ request: FriendRequest }> = ({
  request,
}) => {
  const { acceptRequest, rejectRequest } = useFriendRequests();
  const { addConversation, setActiveConversationId, setContacts } =
    useChatStore();
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await acceptRequest(request.id);
      const [conv, contacts] = await Promise.all([
        getOrCreateDM(request.senderId),
        getContacts(),
      ]);
      addConversation(conv);
      setActiveConversationId(conv.id);
      setContacts(contacts);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="friend-request-card">
      <Avatar
        src={request.sender.photoURL}
        name={request.sender.displayName}
        size="md"
      />
      <div className="friend-request-info">
        <span className="friend-request-name">{request.sender.displayName}</span>
        <span className="friend-request-email">{request.sender.email}</span>
      </div>
      <div className="friend-request-actions">
        <button
          id={`accept-request-${request.id}`}
          className="accept-btn"
          onClick={handleAccept}
          disabled={busy}
          aria-label="Accept friend request"
        >
          ✓
        </button>
        <button
          id={`reject-request-${request.id}`}
          className="reject-btn"
          onClick={() => rejectRequest(request.id)}
          disabled={busy}
          aria-label="Reject friend request"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default FriendRequestCard;
