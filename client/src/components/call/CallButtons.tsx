import React, { useCallback } from "react";
import type { Conversation } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useSocketContext } from "../../contexts/SocketContext";
import { useCall } from "../../contexts/CallProvider";
import { useCallStore } from "../../store/useCallStore";
import { useChatStore } from "../../store/useChatStore";
import type { CallType } from "../../types/call";

interface CallButtonsProps {
  conversation: Conversation;
}

const CallButtons: React.FC<CallButtonsProps> = ({ conversation }) => {
  const { dbUser } = useAuth();
  const { connected } = useSocketContext();
  const { startCall } = useCall();
  const status = useCallStore((s) => s.status);
  const error = useCallStore((s) => s.error);
  const setError = useCallStore((s) => s.setError);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const handleCall = useCallback(
    (
      e: React.MouseEvent,
      callType: CallType
    ) => {
      e.preventDefault();
      e.stopPropagation();

      if (!connected) {
        setError("Not connected — wait for Live in the sidebar");
        return;
      }

      if (status !== "idle") return;

      const otherMember = conversation.members.find(
        (m) => m.userId !== dbUser?.id
      );
      if (!otherMember || !dbUser) return;

      if (!onlineUsers.has(otherMember.userId)) {
        setError(
          "Friend is offline — they must open FLASH on their device and show Live"
        );
        return;
      }

      startCall(
        conversation.id,
        otherMember.userId,
        otherMember.user.displayName,
        callType
      );
    },
    [connected, status, conversation, dbUser, onlineUsers, startCall, setError]
  );

  if (conversation.isGroup || !dbUser) return null;

  const otherMember = conversation.members.find((m) => m.userId !== dbUser.id);
  if (!otherMember) return null;

  const busy = status !== "idle";
  const peerOnline = onlineUsers.has(otherMember.userId);
  const canCall = connected && peerOnline && !busy;

  return (
    <div className="call-buttons">
      {error && status === "idle" && (
        <span className="call-buttons-hint" role="status">
          {error}
        </span>
      )}
      <button
        type="button"
        className="chat-header-call-btn"
        disabled={!canCall}
        onClick={(e) => handleCall(e, "audio")}
        aria-label="Voice call"
        title={
          !connected
            ? "Waiting for Live connection…"
            : !peerOnline
              ? "Friend is offline"
              : busy
                ? "Finish or cancel the current call first"
                : "Voice call"
        }
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
          <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
        </svg>
      </button>
      <button
        type="button"
        className="chat-header-call-btn"
        disabled={!canCall}
        onClick={(e) => handleCall(e, "video")}
        aria-label="Video call"
        title={
          !connected
            ? "Waiting for Live connection…"
            : !peerOnline
              ? "Friend is offline"
              : busy
                ? "Finish or cancel the current call first"
                : "Video call"
        }
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
          <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" />
        </svg>
      </button>
    </div>
  );
};

export default CallButtons;
