import { Server } from "socket.io";
import { adminAuth } from "../config/firebase";
import { registerChatHandlers } from "./chatHandlers";
import { registerPresenceHandlers } from "./presenceHandlers";

// userId → socketId mapping (in-memory)
const onlineUsers = new Map<string, string>();

export const initSocket = (io: Server) => {
  // Authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string;
      if (!token) return next(new Error("Unauthorized"));

      const decoded = await adminAuth.verifyIdToken(token);
      socket.data.userId = decoded.uid;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    if (!userId) return;

    // Track online users
    onlineUsers.set(userId, socket.id);
    console.log(`[Socket] User connected: ${userId}`);

    // Register handlers
    registerChatHandlers(io, socket, userId);
    registerPresenceHandlers(io, socket, userId, onlineUsers);

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      console.log(`[Socket] User disconnected: ${userId}`);
    });
  });
};

export { onlineUsers };
