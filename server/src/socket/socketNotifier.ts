import { Server } from "socket.io";

let io: Server | null = null;
const onlineUsers = new Map<string, string>();

export const bindSocketNotifier = (socketServer: Server) => {
  io = socketServer;
};

export const trackOnlineUser = (userId: string, socketId: string) => {
  onlineUsers.set(userId, socketId);
};

export const untrackOnlineUser = (userId: string) => {
  onlineUsers.delete(userId);
};

export const isUserOnline = (userId: string) => onlineUsers.has(userId);

export const emitToUser = (
  userId: string,
  event: string,
  payload: unknown
): boolean => {
  if (!io) return false;
  const socketId = onlineUsers.get(userId);
  if (!socketId) return false;
  io.to(socketId).emit(event, payload);
  return true;
};
