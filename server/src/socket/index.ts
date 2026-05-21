import { Server } from "socket.io";
import { adminAuth, isFirebaseConfigured } from "../config/firebase";
import { registerChatHandlers } from "./chatHandlers";
import { registerPresenceHandlers } from "./presenceHandlers";
import {
  bindSocketNotifier,
  trackOnlineUser,
  untrackOnlineUser,
} from "./socketNotifier";

export const initSocket = (io: Server) => {
  bindSocketNotifier(io);

  io.use(async (socket, next) => {
    try {
      if (!isFirebaseConfigured || !adminAuth) {
        return next(new Error("Auth not configured"));
      }

      const token = socket.handshake.auth?.token as string;
      if (!token) return next(new Error("Unauthorized"));
      if (!adminAuth) return next(new Error("Auth service unavailable"));

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

    trackOnlineUser(userId, socket.id);
    console.log(`[Socket] User connected: ${userId}`);

    registerChatHandlers(io, socket, userId);
    registerPresenceHandlers(io, socket, userId);

    socket.on("disconnect", () => {
      untrackOnlineUser(userId);
      console.log(`[Socket] User disconnected: ${userId}`);
    });
  });
};
