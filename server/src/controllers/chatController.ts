import { Response } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../types";

// GET /api/chats
export const getConversations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.uid;

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  displayName: true,
                  photoURL: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: {
                select: { id: true, displayName: true },
              },
            },
          },
        },
      },
    },
  });

  const conversationIds = memberships.map((m) => m.conversation.id);

  const unreadByConversation =
    conversationIds.length > 0
      ? await prisma.message.groupBy({
          by: ["conversationId"],
          where: {
            conversationId: { in: conversationIds },
            senderId: { not: userId },
            NOT: { readBy: { has: userId } },
          },
          _count: { id: true },
        })
      : [];

  const unreadMap = new Map(
    unreadByConversation.map((u) => [u.conversationId, u._count.id])
  );

  const conversations = memberships
    .map((m) => ({
      ...m.conversation,
      lastMessage: m.conversation.messages[0] ?? null,
      unreadCount: unreadMap.get(m.conversation.id) ?? 0,
      messages: undefined,
    }))
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.updatedAt;
      const bTime = b.lastMessage?.createdAt ?? b.updatedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  res.json({ success: true, data: conversations });
};

// POST /api/chats/dm  { friendId }
export const getOrCreateDM = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.uid;
  const { friendId } = req.body as { friendId: string };

  if (friendId === userId) {
    res.status(400).json({ success: false, message: "Cannot DM yourself" });
    return;
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    },
  });

  if (!friendship) {
    res.status(403).json({ success: false, message: "Not friends with this user" });
    return;
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      members: { every: { userId: { in: [userId, friendId] } } },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              photoURL: true,
            },
          },
        },
      },
    },
  });

  if (existing && existing.members.length === 2) {
    res.json({ success: true, data: existing });
    return;
  }

  const conversation = await prisma.conversation.create({
    data: {
      isGroup: false,
      members: {
        create: [
          { userId, role: "MEMBER" },
          { userId: friendId, role: "MEMBER" },
        ],
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              photoURL: true,
            },
          },
        },
      },
    },
  });

  res.status(201).json({ success: true, data: conversation });
};

// GET /api/chats/:id/messages?page=1&limit=30
export const getMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.uid;
  const { id: conversationId } = req.params;
  const page = parseInt((req.query.page as string) ?? "1");
  const limit = parseInt((req.query.limit as string) ?? "30");
  const skip = (page - 1) * limit;

  const member = await prisma.groupMember.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
  });

  if (!member) {
    res.status(403).json({ success: false, message: "Not a member" });
    return;
  }

  const [messages, total] = await prisma.$transaction([
    prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            photoURL: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);

  res.json({
    success: true,
    data: {
      data: messages.reverse(),
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    },
  });
};
