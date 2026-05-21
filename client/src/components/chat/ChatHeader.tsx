import React from "react";
import type { Conversation } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useChatStore } from "../../store/useChatStore";
import Avatar from "../ui/Avatar";
import CallButtons from "../call/CallButtons";
import { formatLastSeen } from "../../utils/formatTime";

interface ChatHeaderProps {
  conversation: Conversation;
  onInfoClick?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onInfoClick,
}) => {
  const { dbUser } = useAuth();
  const { onlineUsers, lastSeenByUser, typingUsers } = useChatStore();

  const otherMember = conversation.isGroup
    ? null
    : conversation.members.find((m) => m.userId !== dbUser?.id);

  const displayName = conversation.isGroup
    ? conversation.name ?? "Group"
    : otherMember?.user.displayName ?? "Unknown";

  const photoURL = conversation.isGroup
    ? conversation.photoURL
    : otherMember?.user.photoURL;

  const isOnline =
    !conversation.isGroup && otherMember
      ? onlineUsers.has(otherMember.userId)
      : false;

  const typing = typingUsers[conversation.id] ?? [];
  const typingText =
    typing.length === 1
      ? `${typing[0].displayName} is typing…`
      : typing.length > 1
      ? "Several people are typing…"
      : null;

  const lastSeen =
    otherMember && lastSeenByUser[otherMember.userId]
      ? lastSeenByUser[otherMember.userId]
      : undefined;

  const statusText = typingText
    ? typingText
    : conversation.isGroup
    ? `${conversation.members.length} members`
    : isOnline
    ? "Online"
    : lastSeen
    ? formatLastSeen(lastSeen)
    : "Offline";

  return (
    <div className="chat-header">
      <Avatar
        src={photoURL}
        name={displayName}
        size="md"
        isOnline={!conversation.isGroup ? isOnline : undefined}
      />
      <div className="chat-header-info">
        <span className="chat-header-name">{displayName}</span>
        <span
          className={`chat-header-status ${typingText ? "typing" : isOnline ? "online" : ""}`}
        >
          {statusText}
        </span>
      </div>
      <div className="chat-header-actions">
        <CallButtons conversation={conversation} />
        {conversation.isGroup && (
          <button
            id="group-info-btn"
            className="chat-header-info-btn"
            onClick={onInfoClick}
            aria-label="Group info"
          >
            ℹ
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
