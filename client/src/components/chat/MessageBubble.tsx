import React from "react";
import type { Message } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { formatTime } from "../../utils/formatTime";
import Avatar from "../ui/Avatar";

interface MessageBubbleProps {
  message: Message;
  showAvatar: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar,
}) => {
  const { dbUser } = useAuth();
  const isMine = message.senderId === dbUser?.id;
  const isRead = dbUser
    ? message.readBy.some((id) => id !== dbUser.id)
    : false;

  return (
    <div className={`message-row ${isMine ? "mine" : "theirs"}`}>
      {!isMine && (
        <div className="message-avatar-slot">
          {showAvatar ? (
            <Avatar
              src={message.sender.photoURL}
              name={message.sender.displayName}
              size="sm"
            />
          ) : (
            <div className="message-avatar-spacer" />
          )}
        </div>
      )}

      <div className="message-group">
        {!isMine && showAvatar && (
          <span className="message-sender-name">
            {message.sender.displayName}
          </span>
        )}

        <div className={`message-bubble ${isMine ? "bubble-mine" : "bubble-theirs"}`}>
          {message.type === "IMAGE" ? (
            <img
              src={message.content}
              alt="Shared image"
              className="message-image"
            />
          ) : message.type === "FILE" ? (
            <a
              href={message.content}
              target="_blank"
              rel="noopener noreferrer"
              className="message-file-link"
            >
              📎 Download file
            </a>
          ) : (
            <p className="message-text">{message.content}</p>
          )}

          <div className="message-meta">
            <span className="message-time">
              {formatTime(message.createdAt)}
            </span>
            {isMine && (
              <span
                className={`message-tick ${isRead ? "read" : "sent"}`}
                title={isRead ? "Read" : "Sent"}
              >
                {isRead ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
