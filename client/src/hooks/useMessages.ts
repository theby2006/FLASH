import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";
import { useChatStore } from "../store/useChatStore";
import { getMessages } from "../services/chatService";

export const useMessages = (conversationId: string | null) => {
  const { socket, connected, refreshSignal } = useSocket();
  const { dbUser } = useAuth();
  const {
    messages,
    setMessages,
    prependMessages,
    addMessage,
    setTyping,
    clearTyping,
    clearUnread,
  } = useChatStore();

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);

  const conversationMessages = conversationId
    ? (messages[conversationId] ?? [])
    : [];

  useEffect(() => {
    if (!conversationId) return;

    pageRef.current = 1;
    setHasMore(true);

    const load = async () => {
      setLoading(true);
      try {
        const result = await getMessages(conversationId, 1, 30);
        setMessages(conversationId, result.data);
        setHasMore(result.hasMore);
        pageRef.current = 2;
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [conversationId, setMessages]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit("join_conversation", { conversationId });
    socket.emit("message_read", { conversationId });
    clearUnread(conversationId);
  }, [socket, conversationId, refreshSignal, clearUnread]);

  useEffect(() => {
    if (!socket) return;

    const onTypingStart = ({
      conversationId: convId,
      userId,
      displayName,
    }: {
      conversationId: string;
      userId: string;
      displayName: string;
    }) => setTyping(convId, userId, displayName);

    const onTypingStop = ({
      conversationId: convId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => clearTyping(convId, userId);

    socket.on("typing_start", onTypingStart);
    socket.on("typing_stop", onTypingStop);

    return () => {
      socket.off("typing_start", onTypingStart);
      socket.off("typing_stop", onTypingStop);
    };
  }, [socket, setTyping, clearTyping]);

  const loadMore = useCallback(async () => {
    if (!conversationId || loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await getMessages(conversationId, pageRef.current, 30);
      prependMessages(conversationId, result.data);
      setHasMore(result.hasMore);
      pageRef.current += 1;
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading, hasMore, prependMessages]);

  const sendMessage = useCallback(
    (content: string, type: "TEXT" | "IMAGE" | "FILE" = "TEXT") => {
      const trimmed = content.trim();
      if (!conversationId || !trimmed || !dbUser) return;

      if (!socket?.connected) {
        console.warn("[Chat] Socket disconnected — message not sent");
        return;
      }

      const tempId = `pending-${Date.now()}`;
      addMessage(conversationId, {
        id: tempId,
        conversationId,
        senderId: dbUser.id,
        content: trimmed,
        type,
        createdAt: new Date().toISOString(),
        readBy: [dbUser.id],
        sender: {
          id: dbUser.id,
          email: dbUser.email,
          displayName: dbUser.displayName,
          photoURL: dbUser.photoURL,
          createdAt: dbUser.createdAt,
        },
      });

      socket.emit("send_message", { conversationId, content: trimmed, type });
    },
    [socket, conversationId, dbUser, addMessage]
  );

  return {
    messages: conversationMessages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    canSend: connected,
  };
};
