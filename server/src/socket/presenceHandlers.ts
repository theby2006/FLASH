import { Server, Socket } from "socket.io";
import { prisma } from "../config/db";
import { emitToUser, isUserOnline } from "./socketNotifier";

export const registerPresenceHandlers = async (
  _io: Server,
  socket: Socket,
  userId: string
) => {
  const friendships = await prisma.friendship.findMany({
    where: { userId },
    select: { friendId: true },
  });
  const contactIds = friendships.map((f) => f.friendId);
  const lastSeen = () => new Date().toISOString();

  contactIds.forEach((friendId) => {
    if (isUserOnline(friendId)) {
      socket.emit("user_online", {
        userId: friendId,
        isOnline: true,
        lastSeen: lastSeen(),
      });
    }
  });

  contactIds.forEach((contactId) => {
    emitToUser(contactId, "user_online", {
      userId,
      isOnline: true,
      lastSeen: lastSeen(),
    });
  });

  socket.on("disconnect", () => {
    const seen = lastSeen();
    contactIds.forEach((contactId) => {
      emitToUser(contactId, "user_offline", {
        userId,
        isOnline: false,
        lastSeen: seen,
      });
    });
  });
};
