import { Server, Socket } from "socket.io";
import { prisma } from "../../config/db";
import { saveMessage, markMessagesRead } from "../../services/messageService";

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

      const message = await saveMessage(conversationId, userId, content, type);

      // Broadcast to everyone in the room (including sender)
      io.to(conversationId).emit("new_message", message);
    }
  );

  // Mark messages as read
  socket.on(
    "message_read",
    async ({ conversationId }: { conversationId: string }) => {
      const readIds = await markMessagesRead(conversationId, userId);
      if (readIds.length > 0) {
        socket.to(conversationId).emit("messages_read", {
          conversationId,
          userId,
          messageIds: readIds,
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
