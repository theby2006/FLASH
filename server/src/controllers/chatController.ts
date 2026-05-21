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
    orderBy: { joinedAt: "desc" },
  });

  const conversations = memberships.map((m) => ({
    ...m.conversation,
    lastMessage: m.conversation.messages[0] ?? null,
    messages: undefined,
  }));

  res.json({ success: true, data: conversations });
};

// POST /api/chats/dm  { friendId }
export const getOrCreateDM = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.uid;
  const { friendId } = req.body as { friendId: string };

  if (!friendId) {
    res.status(400).json({ success: false, message: "friendId required" });
    return;
  }

  // Find existing non-group conversation with exactly these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: friendId } } },
      ],
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

  if (existing) {
    res.json({ success: true, data: existing });
    return;
  }

  // Create new DM conversation
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

  // Verify membership
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
