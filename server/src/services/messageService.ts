import { prisma } from "../config/db";
import { MessageType } from "@prisma/client";

export const saveMessage = async (
  conversationId: string,
  senderId: string,
  content: string,
  type: MessageType = "TEXT"
) => {
  const message = await prisma.message.create({
    data: { conversationId, senderId, content, type, readBy: [senderId] },
    include: {
      sender: {
        select: { id: true, email: true, displayName: true, photoURL: true },
      },
    },
  });

  // Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
};

export const markMessagesRead = async (
  conversationId: string,
  userId: string
) => {
  // Get messages not yet read by this user
  const unread = await prisma.message.findMany({
    where: {
      conversationId,
      NOT: { readBy: { has: userId } },
    },
    select: { id: true, readBy: true },
  });

  await Promise.all(
    unread.map((msg) =>
      prisma.message.update({
        where: { id: msg.id },
        data: { readBy: { push: userId } },
      })
    )
  );

  return unread.map((m) => m.id);
};
