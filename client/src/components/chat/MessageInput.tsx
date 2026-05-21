import React, { useState, useRef, useCallback } from "react";
import { useSocket } from "../../hooks/useSocket";
import { TYPING_DEBOUNCE_MS } from "../../utils/constants";
import { useAuth } from "../../hooks/useAuth";

interface MessageInputProps {
  conversationId: string;
  onSend: (content: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  onSend,
}) => {
  const [text, setText] = useState("");
  const { socket } = useSocket();
  const { dbUser } = useAuth();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const emitTypingStop = useCallback(() => {
    if (isTypingRef.current && socket) {
      socket.emit("typing_stop", { conversationId });
      isTypingRef.current = false;
    }
  }, [socket, conversationId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
    }

    // Typing indicator
    if (socket && dbUser) {
      if (!isTypingRef.current) {
        socket.emit("typing_start", {
          conversationId,
          displayName: dbUser.displayName,
        });
        isTypingRef.current = true;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(emitTypingStop, TYPING_DEBOUNCE_MS);
    }
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    emitTypingStop();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [text, onSend, emitTypingStop]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input-bar">
      <textarea
        id="message-input"
        ref={textareaRef}
        className="message-textarea"
        placeholder="Type a message… (Enter to send)"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
        aria-label="Message input"
      />
      <button
        id="send-message-btn"
        className={`send-btn ${text.trim() ? "active" : ""}`}
        onClick={handleSend}
        disabled={!text.trim()}
        aria-label="Send message"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
};

export default MessageInput;
