import { Server, Socket } from "socket.io";
import { prisma } from "../../config/db";

export const registerPresenceHandlers = async (
  io: Server,
  socket: Socket,
  userId: string,
  onlineUsers: Map<string, string>
) => {
  // Get this user's contact IDs
  const friendships = await prisma.friendship.findMany({
    where: { userId },
    select: { friendId: true },
  });
  const contactIds = friendships.map((f) => f.friendId);

  // Notify online contacts that this user is now online
  contactIds.forEach((contactId) => {
    const contactSocketId = onlineUsers.get(contactId);
    if (contactSocketId) {
      io.to(contactSocketId).emit("user_online", {
        userId,
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });
    }
  });

  // On disconnect — notify all online contacts
  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    const lastSeen = new Date().toISOString();

    contactIds.forEach((contactId) => {
      const contactSocketId = onlineUsers.get(contactId);
      if (contactSocketId) {
        io.to(contactSocketId).emit("user_offline", {
          userId,
          isOnline: false,
          lastSeen,
        });
      }
    });
  });
};
