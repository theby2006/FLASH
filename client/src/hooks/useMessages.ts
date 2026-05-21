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
    clearUnread,
    markMessagesReadByIds,
  } = useChatStore();

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const joinedRef = useRef<string | null>(null);

  const conversationMessages = conversationId
    ? (messages[conversationId] ?? [])
    : [];

  useEffect(() => {
    if (!conversationId) return;

    pageRef.current = 1;
    setHasMore(true);
    joinedRef.current = null;

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
    if (joinedRef.current === conversationId) return;

    socket.emit("join_conversation", { conversationId });
    socket.emit("message_read", { conversationId });
    joinedRef.current = conversationId;
    clearUnread(conversationId);
  }, [socket, conversationId, clearUnread]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: Message) => {
      addMessage(msg.conversationId, msg);
      updateLastMessage(msg.conversationId, msg);

      if (msg.conversationId === conversationId) {
        socket.emit("message_read", { conversationId: msg.conversationId });
      }
    };

    socket.on("new_message", onNewMessage);
    return () => {
      socket.off("new_message", onNewMessage);
    };
  }, [socket, conversationId, addMessage, updateLastMessage]);

  useEffect(() => {
    if (!socket) return;

    const onMessagesRead = ({
      conversationId: convId,
      userId,
      messageIds,
    }: {
      conversationId: string;
      userId: string;
      messageIds: string[];
    }) => {
      markMessagesReadByIds(convId, userId, messageIds);
    };

    socket.on("messages_read", onMessagesRead);
    return () => {
      socket.off("messages_read", onMessagesRead);
    };
  }, [socket, markMessagesReadByIds]);

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
    (content: string, type: Message["type"] = "TEXT") => {
      if (!socket || !conversationId || !content.trim()) return;
      socket.emit("send_message", { conversationId, content, type });
    },
    [socket, conversationId]
  );

  return {
    messages: conversationMessages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
  };
};
