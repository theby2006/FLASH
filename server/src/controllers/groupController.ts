import { Response } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../types";

// POST /api/groups  { name, memberIds: string[] }
export const createGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.uid;
  const { name, memberIds } = req.body as {
    name: string;
    memberIds: string[];
  };

  if (!name?.trim()) {
    res.status(400).json({ success: false, message: "Group name required" });
    return;
  }

  if (!memberIds || memberIds.length < 1) {
    res
      .status(400)
      .json({ success: false, message: "At least 1 other member required" });
    return;
  }

  // Deduplicate and exclude self if accidentally included
  const uniqueMembers = [...new Set(memberIds.filter((id) => id !== userId))];

  const group = await prisma.conversation.create({
    data: {
      isGroup: true,
      name: name.trim(),
      members: {
        create: [
          { userId, role: "ADMIN" },
          ...uniqueMembers.map((memberId) => ({
            userId: memberId,
            role: "MEMBER" as const,
          })),
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

  res.status(201).json({ success: true, data: group });
};

// GET /api/groups/:id
export const getGroupInfo = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.uid;
  const { id } = req.params;

  const member = await prisma.groupMember.findUnique({
    where: { userId_conversationId: { userId, conversationId: id } },
  });

  if (!member) {
    res.status(403).json({ success: false, message: "Not a member" });
    return;
  }

  const group = await prisma.conversation.findUnique({
    where: { id },
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

  res.json({ success: true, data: group });
};

// POST /api/groups/:id/members  { userId }
export const addMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const requesterId = req.user!.uid;
  const { id: conversationId } = req.params;
  const { userId } = req.body as { userId: string };

  const requesterMembership = await prisma.groupMember.findUnique({
    where: {
      userId_conversationId: { userId: requesterId, conversationId },
    },
  });

  if (!requesterMembership || requesterMembership.role !== "ADMIN") {
    res.status(403).json({ success: false, message: "Only admins can add members" });
    return;
  }

  await prisma.groupMember.create({
    data: { userId, conversationId, role: "MEMBER" },
  });

  res.json({ success: true, message: "Member added" });
};

// DELETE /api/groups/:id/members/:userId
export const removeMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const requesterId = req.user!.uid;
  const { id: conversationId, userId } = req.params;

  const requesterMembership = await prisma.groupMember.findUnique({
    where: {
      userId_conversationId: { userId: requesterId, conversationId },
    },
  });

  const isSelf = requesterId === userId;
  const isAdmin = requesterMembership?.role === "ADMIN";

  if (!isSelf && !isAdmin) {
    res
      .status(403)
      .json({ success: false, message: "Permission denied" });
    return;
  }

  await prisma.groupMember.delete({
    where: { userId_conversationId: { userId, conversationId } },
  });

  res.json({ success: true, message: "Member removed" });
};
