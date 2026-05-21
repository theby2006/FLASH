import { Server } from "socket.io";
import { prisma } from "../config/db";
import { adminAuth, isFirebaseConfigured } from "../config/firebase";
import { resolveDbUserId } from "../services/userIdentity";
import { registerChatHandlers } from "./chatHandlers";
import {
  registerPresenceHandlers,
  notifyFriendsUserOnline,
  notifyFriendsUserOffline,
} from "./presenceHandlers";
import { registerCallHandlers } from "./callHandlers";
import {
  bindSocketNotifier,
  trackOnlineUser,
  untrackOnlineUser,
  isUserOnline,
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

      const decoded = await adminAuth.verifyIdToken(token);
      socket.data.userId = await resolveDbUserId(
        decoded.uid,
        decoded.email ?? ""
      );
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    if (!userId) return;

    const wasOffline = !isUserOnline(userId);
    trackOnlineUser(userId, socket.id);

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    for (const m of memberships) {
      socket.join(m.conversationId);
    }

    console.log(`[Socket] User connected: ${userId} (${memberships.length} chats)`);

    if (wasOffline) {
      await notifyFriendsUserOnline(userId);
    }

    await registerPresenceHandlers(io, socket, userId);
    registerChatHandlers(io, socket, userId);
    registerCallHandlers(io, socket, userId);

    socket.on("disconnect", async () => {
      untrackOnlineUser(userId, socket.id);
      console.log(`[Socket] User disconnected: ${userId}`);
      if (!isUserOnline(userId)) {
        await notifyFriendsUserOffline(userId);
      }
    });
  });
};
