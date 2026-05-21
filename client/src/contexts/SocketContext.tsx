import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../utils/constants";
import { useAuthContext } from "./AuthContext";
import { useChatStore } from "../store/useChatStore";
import type { Message } from "../types";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  /** Increments on each connect/reconnect — triggers data refresh */
  refreshSignal: number;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  refreshSignal: 0,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { idToken } = useAuthContext();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const { setUserOnline, setUserOffline, markMessagesReadByIds } = useChatStore();

  useEffect(() => {
    if (!idToken) {
      socket?.disconnect();
      setSocket(null);
      setConnected(false);
      return;
    }

    const s = io(SOCKET_URL, {
      path: "/socket.io",
      auth: { token: idToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    setSocket(s);

    const onConnect = () => {
      setConnected(true);
      setRefreshSignal((n) => n + 1);
      console.log("[Socket] Connected");
    };

    s.on("connect", onConnect);
    s.on("disconnect", (reason) => {
      setConnected(false);
      console.log("[Socket] Disconnected:", reason);
    });
    s.on("connect_error", (err) =>
      console.error("[Socket] Connect error:", err.message)
    );

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
  }, [idToken, setUserOnline, setUserOffline, markMessagesReadByIds]);

  return (
    <SocketContext.Provider value={{ socket, connected, refreshSignal }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
