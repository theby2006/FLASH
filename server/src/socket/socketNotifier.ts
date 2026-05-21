import { Server } from "socket.io";

let io: Server | null = null;
/** userId → active socket ids (supports multiple tabs/devices) */
const onlineUsers = new Map<string, Set<string>>();

export const bindSocketNotifier = (socketServer: Server) => {
  io = socketServer;
};

export const trackOnlineUser = (userId: string, socketId: string) => {
  let sockets = onlineUsers.get(userId);
  if (!sockets) {
    sockets = new Set();
    onlineUsers.set(userId, sockets);
  }
  sockets.add(socketId);
};

export const untrackOnlineUser = (userId: string, socketId: string) => {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) onlineUsers.delete(userId);
};

export const isUserOnline = (userId: string) => {
  const sockets = onlineUsers.get(userId);
  return sockets !== undefined && sockets.size > 0;
};

export const emitToUser = (
  userId: string,
  event: string,
  payload: unknown
): boolean => {
  if (!io) return false;
  const sockets = onlineUsers.get(userId);
  if (!sockets || sockets.size === 0) return false;
  sockets.forEach((socketId) => io!.to(socketId).emit(event, payload));
  return true;
};

export const getOnlineUserIds = (): string[] =>
  Array.from(onlineUsers.keys());
