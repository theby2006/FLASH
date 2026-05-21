import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL, SOCKET_URL } from "../utils/constants";
import { agentDebugLog } from "../utils/agentDebugLog";
import { useAuthContext } from "./AuthContext";
import { useChatStore } from "../store/useChatStore";
import type { Message } from "../types";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  socketError: string | null;
  /** Increments on each connect/reconnect — triggers data refresh */
  refreshSignal: number;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  socketError: null,
  refreshSignal: 0,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { idToken, dbUser } = useAuthContext();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const { setUserOnline, setUserOffline, markMessagesReadByIds } = useChatStore();

  useEffect(() => {
    if (!idToken) {
      socket?.disconnect();
      setSocket(null);
      setConnected(false);
      return;
    }

    const socketTarget = SOCKET_URL ?? window.location.origin;
    const s = io(socketTarget, {
      path: "/socket.io",
      auth: { token: idToken },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    setSocket(s);

    const onConnect = () => {
      setConnected(true);
      setSocketError(null);
      setRefreshSignal((n) => n + 1);
      console.log("[Socket] Connected");
      agentDebugLog(
        "SocketContext.tsx:onConnect",
        "client socket connected",
        {
          dbUserId: dbUser?.id ?? null,
          apiBase: API_BASE_URL || "(vite proxy)",
          socketTarget: SOCKET_URL ?? window.location.origin,
        },
        "H1"
      );
    };

    s.on("connect", onConnect);
    s.on("disconnect", (reason) => {
      setConnected(false);
      console.log("[Socket] Disconnected:", reason);
    });
    s.on("connect_error", (err) => {
      setConnected(false);
      setSocketError(err.message);
      console.error("[Socket] Connect error:", err.message, "target:", socketTarget);
      agentDebugLog(
        "SocketContext.tsx:connect_error",
        "client socket connect_error",
        {
          dbUserId: dbUser?.id ?? null,
          apiBase: API_BASE_URL || "(vite proxy)",
          socketTarget,
          message: err.message,
        },
        "H1"
      );
    });

    s.on(
      "user_online",
      ({
        userId,
        lastSeen,
      }: {
        userId: string;
        isOnline?: boolean;
        lastSeen?: string;
      }) => setUserOnline(userId, lastSeen)
    );
    s.on(
      "user_offline",
      ({
        userId,
        lastSeen,
      }: {
        userId: string;
        isOnline?: boolean;
        lastSeen?: string;
      }) => setUserOffline(userId, lastSeen)
    );
    s.on(
      "messages_read",
      ({
        conversationId,
        userId,
        messageIds,
      }: {
        conversationId: string;
        userId: string;
        messageIds: string[];
      }) => {
        markMessagesReadByIds(conversationId, userId, messageIds);
      }
    );

    s.on("new_message", (msg: Message) => {
      const state = useChatStore.getState();
      state.addMessage(msg.conversationId, msg);
      state.updateLastMessage(msg.conversationId, msg);

      if (msg.conversationId === state.activeConversationId) {
        s.emit("message_read", { conversationId: msg.conversationId });
        state.clearUnread(msg.conversationId);
      } else {
        state.incrementUnread(msg.conversationId);
      }
    });

    return () => {
      s.off("connect", onConnect);
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [idToken, dbUser?.id, setUserOnline, setUserOffline, markMessagesReadByIds]);

  return (
    <SocketContext.Provider
      value={{ socket, connected, socketError, refreshSignal }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
