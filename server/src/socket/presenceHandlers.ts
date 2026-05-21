import { Server, Socket } from "socket.io";
import { prisma } from "../config/db";
import { emitToUser, isUserOnline } from "./socketNotifier";

async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: { userId },
    select: { friendId: true },
  });
  return friendships.map((f) => f.friendId);
}

export async function notifyFriendsUserOnline(userId: string): Promise<void> {
  const contactIds = await getFriendIds(userId);
  const lastSeen = new Date().toISOString();
  const payload = { userId, isOnline: true, lastSeen };
  contactIds.forEach((friendId) => emitToUser(friendId, "user_online", payload));
}

export async function notifyFriendsUserOffline(userId: string): Promise<void> {
  const contactIds = await getFriendIds(userId);
  const lastSeen = new Date().toISOString();
  const payload = { userId, isOnline: false, lastSeen };
  contactIds.forEach((friendId) => emitToUser(friendId, "user_offline", payload));
}

/** Tell this socket which friends are currently online */
export const registerPresenceHandlers = async (
  _io: Server,
  socket: Socket,
  userId: string
) => {
  const contactIds = await getFriendIds(userId);
  const lastSeen = new Date().toISOString();

  contactIds.forEach((friendId) => {
    if (isUserOnline(friendId)) {
      socket.emit("user_online", {
        userId: friendId,
        isOnline: true,
        lastSeen,
      });
    }
  });
};
