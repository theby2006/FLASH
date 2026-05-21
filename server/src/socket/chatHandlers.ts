import { Server, Socket } from "socket.io";
import { prisma } from "../config/db";
import { saveMessage, markMessagesRead } from "../services/messageService";
import { emitToUser } from "./socketNotifier";

export const registerChatHandlers = (
  io: Server,
  socket: Socket,
  userId: string
) => {
  // Join a conversation room
  socket.on(
    "join_conversation",
    async ({ conversationId }: { conversationId: string }) => {
      // Verify membership
      const member = await prisma.groupMember.findUnique({
        where: {
          userId_conversationId: { userId, conversationId },
        },
      });
      if (!member) return;
      socket.join(conversationId);
    }
  );

  // Send a message
  socket.on(
    "send_message",
    async ({
      conversationId,
      content,
      type = "TEXT",
    }: {
      conversationId: string;
      content: string;
      type?: "TEXT" | "IMAGE" | "FILE";
    }) => {
      if (!content?.trim() && type === "TEXT") return;

      // Verify membership
      const member = await prisma.groupMember.findUnique({
        where: { userId_conversationId: { userId, conversationId } },
      });
      if (!member) return;

      // Persist to PostgreSQL first, then push in real time via Socket.io
      const message = await saveMessage(conversationId, userId, content, type);

      const members = await prisma.groupMember.findMany({
        where: { conversationId },
        select: { userId: true },
      });
      members.forEach((m) => emitToUser(m.userId, "new_message", message));
    }
  );

  // Mark messages as read
  socket.on(
    "message_read",
    async ({ conversationId }: { conversationId: string }) => {
      const readIds = await markMessagesRead(conversationId, userId);
      if (readIds.length > 0) {
        const payload = { conversationId, userId, messageIds: readIds };
        socket.to(conversationId).emit("messages_read", payload);
        const members = await prisma.groupMember.findMany({
          where: { conversationId },
          select: { userId: true },
        });
        members.forEach((m) => {
          if (m.userId !== userId) {
            emitToUser(m.userId, "messages_read", payload);
          }
        });
      }
    }
  );

  // Typing indicators
  socket.on(
    "typing_start",
    ({
      conversationId,
      displayName,
    }: {
      conversationId: string;
      displayName: string;
    }) => {
      socket.to(conversationId).emit("typing_start", {
        conversationId,
        userId,
        displayName,
      });
    }
  );

  socket.on(
    "typing_stop",
    ({ conversationId }: { conversationId: string }) => {
      socket.to(conversationId).emit("typing_stop", {
        conversationId,
        userId,
      });
    }
  );
};
