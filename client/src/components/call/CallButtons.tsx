import React from "react";
import type { Conversation } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useCall } from "../../contexts/CallProvider";
import { useCallStore } from "../../store/useCallStore";

interface CallButtonsProps {
  conversation: Conversation;
}

const CallButtons: React.FC<CallButtonsProps> = ({ conversation }) => {
  const { dbUser } = useAuth();
  const { startCall } = useCall();
  const status = useCallStore((s) => s.status);

  if (conversation.isGroup || !dbUser) return null;

  const otherMember = conversation.members.find((m) => m.userId !== dbUser.id);
  if (!otherMember) return null;

  const disabled = status !== "idle";

  return (
    <div className="call-buttons">
      <button
        type="button"
        className="chat-header-call-btn"
        disabled={disabled}
        onClick={() =>
          startCall(
            conversation.id,
            otherMember.userId,
            otherMember.user.displayName,
            "audio"
          )
        }
        aria-label="Voice call"
        title="Voice call"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
          <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
        </svg>
      </button>
      <button
        type="button"
        className="chat-header-call-btn"
        disabled={disabled}
        onClick={() =>
          startCall(
            conversation.id,
            otherMember.userId,
            otherMember.user.displayName,
            "video"
          )
        }
        aria-label="Video call"
        title="Video call"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
          <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" />
        </svg>
      </button>
    </div>
  );
};

export default CallButtons;
