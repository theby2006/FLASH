import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useChatStore } from "../store/useChatStore";
import { getMessages } from "../services/chatService";
import type { Message } from "../types";

export const useMessages = (conversationId: string | null) => {
  const { socket } = useSocket();
  const {
    messages,
    setMessages,
    prependMessages,
    addMessage,
    updateLastMessage,
    setTyping,
    clearTyping,
  } = useChatStore();

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const joinedRef = useRef<Set<string>>(new Set());

  const conversationMessages = conversationId
    ? (messages[conversationId] ?? [])
    : [];

  // Load initial messages when conversation changes
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

  // Join socket room when conversation changes
  useEffect(() => {
    if (!socket || !conversationId) return;
    if (joinedRef.current.has(conversationId)) return;

    socket.emit("join_conversation", { conversationId });
    joinedRef.current.add(conversationId);

    // Mark messages as read when joining
    socket.emit("message_read", { conversationId });
  }, [socket, conversationId]);

  // Listen to new messages
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: Message) => {
      addMessage(msg.conversationId, msg);
      updateLastMessage(msg.conversationId, msg);

      // Auto mark-read if this is the active conversation
      if (msg.conversationId === conversationId) {
        socket.emit("message_read", { conversationId: msg.conversationId });
      }
    };

    socket.on("new_message", onNewMessage);
    return () => { socket.off("new_message", onNewMessage); };
  }, [socket, conversationId, addMessage, updateLastMessage]);

  // Listen to typing events
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

  // Load older messages (infinite scroll)
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

  // Send a message via socket
  const sendMessage = useCallback(
    (content: string, type: Message["type"] = "TEXT") => {
      if (!socket || !conversationId || !content.trim()) return;
      socket.emit("send_message", { conversationId, content, type });
    },
    [socket, conversationId]
  );

  return { messages: conversationMessages, loading, hasMore, loadMore, sendMessage };
};
