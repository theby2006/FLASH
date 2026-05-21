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
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { idToken } = useAuthContext();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { setUserOnline, setUserOffline, markMessagesReadByIds } = useChatStore();

  useEffect(() => {
    if (!idToken) {
      socket?.disconnect();
      setSocket(null);
      setConnected(false);
      return;
    }

    const s = io(SOCKET_URL, {
      auth: { token: idToken },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(s);

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", (err) =>
      console.error("[Socket] Connect error:", err.message)
    );

    s.on(
      "user_online",
      ({ userId }: { userId: string }) => setUserOnline(userId)
    );
    s.on(
      "user_offline",
      ({ userId }: { userId: string }) => setUserOffline(userId)
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
      if (msg.conversationId !== state.activeConversationId) {
        state.incrementUnread(msg.conversationId);
      }
    });

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [idToken, setUserOnline, setUserOffline, markMessagesReadByIds]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
