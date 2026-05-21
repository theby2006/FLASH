import React from "react";
import type { Conversation } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useChatStore } from "../../store/useChatStore";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { formatTime } from "../../utils/formatTime";

interface ContactItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

const ContactItem: React.FC<ContactItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const { dbUser } = useAuth();
  const { onlineUsers } = useChatStore();

  // For DMs, show the other user's info
  const otherMember = conversation.isGroup
    ? null
    : conversation.members.find((m) => m.userId !== dbUser?.id);

  const displayName = conversation.isGroup
    ? conversation.name ?? "Group"
    : otherMember?.user.displayName ?? "Unknown";

  const photoURL = conversation.isGroup
    ? conversation.photoURL
    : otherMember?.user.photoURL;

  const isOnline = conversation.isGroup
    ? undefined
    : otherMember
    ? onlineUsers.has(otherMember.userId)
    : false;

  const lastMsg = conversation.lastMessage;
  const lastMsgText = lastMsg
    ? lastMsg.type === "TEXT"
      ? lastMsg.content
      : lastMsg.type === "IMAGE"
      ? "📷 Photo"
      : "📎 File"
    : "No messages yet";

  return (
    <button
      id={`contact-item-${conversation.id}`}
      className={`contact-item ${isActive ? "active" : ""}`}
      onClick={onClick}
      aria-label={`Open chat with ${displayName}`}
    >
      <Avatar
        src={photoURL}
        name={displayName}
        size="md"
        isOnline={isOnline}
      />
      <div className="contact-item-info">
        <div className="contact-item-top">
          <span className="contact-item-name">{displayName}</span>
          {lastMsg && (
            <span className="contact-item-time">
              {formatTime(lastMsg.createdAt)}
            </span>
          )}
        </div>
        <div className="contact-item-bottom">
          <span className="contact-item-last-msg">{lastMsgText}</span>
          <Badge count={conversation.unreadCount ?? 0} />
        </div>
      </div>
    </button>
  );
};

export default ContactItem;
