import React, { useState } from "react";
import type { FriendRequest } from "../../types";
import Avatar from "../ui/Avatar";
import { useChatStore } from "../../store/useChatStore";
import { getOrCreateDM } from "../../services/chatService";

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}

const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  request,
  onAccept,
  onReject,
}) => {
  const { addConversation, setActiveConversationId } = useChatStore();
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await onAccept(request.id);
      const conv = await getOrCreateDM(request.senderId);
      addConversation(conv);
      setActiveConversationId(conv.id);
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
          onClick={() => onReject(request.id)}
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
