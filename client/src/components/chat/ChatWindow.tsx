import React, { useEffect, useRef, useCallback } from "react";
import { useMessages } from "../../hooks/useMessages";
import { useChatStore } from "../../store/useChatStore";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import ChatHeader from "./ChatHeader";
import Spinner from "../ui/Spinner";
import { formatDateSeparator } from "../../utils/formatTime";
import type { Conversation } from "../../types";

interface ChatWindowProps {
  conversation: Conversation;
  onInfoClick?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onInfoClick,
}) => {
  const { messages, loading, hasMore, loadMore, sendMessage } = useMessages(
    conversation.id
  );
  const { typingUsers } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Preserve scroll position when loading older messages
  useEffect(() => {
    if (loading && scrollRef.current) {
      prevScrollHeight.current = scrollRef.current.scrollHeight;
    } else if (!loading && scrollRef.current && prevScrollHeight.current) {
      const newScrollHeight = scrollRef.current.scrollHeight;
      scrollRef.current.scrollTop =
        newScrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = 0;
    }
  }, [loading]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    if (scrollRef.current.scrollTop < 80 && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  const typing = typingUsers[conversation.id] ?? [];

  // Group messages by date for separators
  const getDateKey = (dateStr: string) =>
    new Date(dateStr).toDateString();

  let lastDateKey = "";

  return (
    <div className="chat-window">
      <ChatHeader conversation={conversation} onInfoClick={onInfoClick} />

      <div
        className="chat-messages"
        ref={scrollRef}
        onScroll={handleScroll}
        id="chat-messages-scroll"
      >
        {loading && messages.length === 0 && (
          <div className="chat-loading">
            <Spinner size="md" />
          </div>
        )}

        {hasMore && messages.length > 0 && (
          <div className="chat-load-more">
            {loading ? <Spinner size="sm" /> : (
              <button className="load-more-btn" onClick={loadMore}>
                Load older messages
              </button>
            )}
          </div>
        )}

        {messages.map((msg, idx) => {
          const dateKey = getDateKey(msg.createdAt);
          const showDate = dateKey !== lastDateKey;
          lastDateKey = dateKey;

          const prevMsg = messages[idx - 1];
          const showAvatar =
            !prevMsg || prevMsg.senderId !== msg.senderId;

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div className="date-separator">
                  <span>{formatDateSeparator(msg.createdAt)}</span>
                </div>
              )}
              <MessageBubble message={msg} showAvatar={showAvatar} />
            </React.Fragment>
          );
        })}

        {typing.length > 0 && (
          <div className="typing-indicator">
            <span className="typing-dots">
              <span /><span /><span />
            </span>
            <span className="typing-label">
              {typing.map((u) => u.displayName).join(", ")} typing…
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput
        conversationId={conversation.id}
        onSend={sendMessage}
      />
    </div>
  );
};

export default ChatWindow;
