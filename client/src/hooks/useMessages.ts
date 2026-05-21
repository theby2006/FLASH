import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";
import { useChatStore } from "../store/useChatStore";
import { getMessages } from "../services/chatService";
import { ACTIVE_CHAT_SYNC_MS } from "../utils/constants";
import type { Message } from "../types";

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
    mergeLatestMessages,
  } = useChatStore();

  const mergeLatestMessagesRef = useRef(mergeLatestMessages);
  mergeLatestMessagesRef.current = mergeLatestMessages;

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

  // Fast backup sync so messages appear within ~2s if socket event is missed (LAN/mobile)
  useEffect(() => {
    if (!conversationId) return;

    const sync = async () => {
      try {
        const result = await getMessages(conversationId, 1, 30);
        mergeLatestMessagesRef.current(conversationId, result.data);
      } catch {
        /* ignore poll errors */
      }
    };

    const intervalId = window.setInterval(sync, ACTIVE_CHAT_SYNC_MS);
    return () => window.clearInterval(intervalId);
  }, [conversationId]);

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

      socket.emit(
        "send_message",
        { conversationId, content: trimmed, type },
        (res?: { ok: boolean; message?: Message; error?: string }) => {
          if (res?.ok && res.message) {
            addMessage(conversationId, res.message);
            useChatStore.getState().updateLastMessage(conversationId, res.message);
          } else if (!res?.ok) {
            console.warn("[Chat] Send failed:", res?.error);
          }
        }
      );
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
