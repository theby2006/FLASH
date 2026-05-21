import React from "react";
import type { FriendRequest } from "../../types";
import Avatar from "../ui/Avatar";
import { useFriendRequests } from "../../hooks/useFriendRequests";

const FriendRequestCard: React.FC<{ request: FriendRequest }> = ({
  request,
}) => {
  const { acceptRequest, rejectRequest } = useFriendRequests();

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
          onClick={() => acceptRequest(request.id)}
          aria-label="Accept friend request"
        >
          ✓
        </button>
        <button
          id={`reject-request-${request.id}`}
          className="reject-btn"
          onClick={() => rejectRequest(request.id)}
          aria-label="Reject friend request"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default FriendRequestCard;
