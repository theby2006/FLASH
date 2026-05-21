import { useEffect, useCallback, useRef } from "react";
import { useSocketContext } from "../contexts/SocketContext";
import { useChatStore } from "../store/useChatStore";
import { getConversations, getMessages } from "../services/chatService";
import { getContacts, getPendingRequests } from "../services/userService";
import {
  AUTO_REFRESH_INTERVAL_CONNECTED_MS,
  AUTO_REFRESH_INTERVAL_DISCONNECTED_MS,
  VISIBILITY_REFRESH_DEBOUNCE_MS,
} from "../utils/constants";

/**
 * Keeps conversations, contacts, requests, and active chat in sync via
 * periodic HTTP refresh + immediate refresh on socket reconnect / tab focus.
 */
export const useAutoRefresh = () => {
  const { socket, connected, refreshSignal } = useSocketContext();
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setConversations = useChatStore((s) => s.setConversations);
  const setContacts = useChatStore((s) => s.setContacts);
  const setPendingRequests = useChatStore((s) => s.setPendingRequests);
  const mergeLatestMessages = useChatStore((s) => s.mergeLatestMessages);
  const clearUnread = useChatStore((s) => s.clearUnread);

  const refreshingRef = useRef(false);

  const refreshAll = useCallback(
    async (opts?: { syncActiveMessages?: boolean }) => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      const syncMessages =
        opts?.syncActiveMessages ?? (!connected || !!activeConversationId);

      try {
        const [convs, contacts, reqs] = await Promise.all([
          getConversations(),
          getContacts(),
          getPendingRequests(),
        ]);
        setConversations(convs);
        setContacts(contacts);
        setPendingRequests(reqs);

        const activeId = useChatStore.getState().activeConversationId;
        if (activeId && syncMessages) {
          const result = await getMessages(activeId, 1, 30);
          mergeLatestMessages(activeId, result.data);
        }
      } catch (err) {
        console.error("[AutoRefresh]", err);
      } finally {
        refreshingRef.current = false;
      }
    },
    [
      connected,
      activeConversationId,
      setConversations,
      setContacts,
      setPendingRequests,
      mergeLatestMessages,
    ]
  );

  const rejoinActiveRoom = useCallback(() => {
    if (!socket?.connected || !activeConversationId) return;
    socket.emit("join_conversation", { conversationId: activeConversationId });
    socket.emit("message_read", { conversationId: activeConversationId });
    clearUnread(activeConversationId);
  }, [socket, activeConversationId, clearUnread]);

  // Initial + interval (faster poll when socket disconnected)
  useEffect(() => {
    refreshAll();
    const ms = connected
      ? AUTO_REFRESH_INTERVAL_CONNECTED_MS
      : AUTO_REFRESH_INTERVAL_DISCONNECTED_MS;
    const intervalId = window.setInterval(refreshAll, ms);
    return () => window.clearInterval(intervalId);
  }, [refreshAll, connected]);

  // After socket reconnect — full sync including open chat messages
  useEffect(() => {
    if (refreshSignal === 0) return;
    void refreshAll({ syncActiveMessages: true });
    rejoinActiveRoom();
  }, [refreshSignal, refreshAll, rejoinActiveRoom]);

  // Tab visible again
  useEffect(() => {
    let debounceId: ReturnType<typeof setTimeout> | undefined;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      debounceId = setTimeout(() => {
        void refreshAll({ syncActiveMessages: !connected });
        rejoinActiveRoom();
      }, VISIBILITY_REFRESH_DEBOUNCE_MS);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (debounceId) clearTimeout(debounceId);
    };
  }, [refreshAll, rejoinActiveRoom]);

  // Re-join when active chat changes while connected
  useEffect(() => {
    if (connected && activeConversationId) {
      rejoinActiveRoom();
    }
  }, [activeConversationId, connected, rejoinActiveRoom]);

  return { refreshAll, connected };
};
