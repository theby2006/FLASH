import { Response } from "express";
import { prisma } from "../config/db";
import { isUserOnline } from "../socket/socketNotifier";
import { AuthRequest } from "../types";
import { emitToUser } from "../socket/socketNotifier";

// GET /api/users/search?email=
export const searchByEmail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { email } = req.query as { email: string };
  const currentUserEmail = req.user!.email;

  if (!email) {
    res.status(400).json({ success: false, message: "Email query required" });
    return;
  }

  if (email === currentUserEmail) {
    res
      .status(400)
      .json({ success: false, message: "Cannot search yourself" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true, photoURL: true },
  });

  res.json({ success: true, data: user ?? null });
};

// POST /api/users/request  { receiverId }
export const sendFriendRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const senderId = req.user!.uid;
  const { receiverId } = req.body as { receiverId: string };

  if (!receiverId) {
    res.status(400).json({ success: false, message: "receiverId required" });
    return;
  }

  // Check no duplicate request
  const existing = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });

  if (existing) {
    res.status(409).json({
      success: false,
      message: "Friend request already exists",
    });
    return;
  }

  // Check no existing friendship
  const existingFriendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: senderId, friendId: receiverId },
        { userId: receiverId, friendId: senderId },
      ],
    },
  });

  if (existingFriendship) {
    res.status(409).json({ success: false, message: "Already friends" });
    return;
  }

  const friendRequest = await prisma.friendRequest.create({
    data: { senderId, receiverId, status: "PENDING" },
    include: {
      sender: {
        select: { id: true, email: true, displayName: true, photoURL: true },
      },
      receiver: {
        select: { id: true, email: true, displayName: true, photoURL: true },
      },
    },
  });

  emitToUser(receiverId, "friend_request", friendRequest);

  res.status(201).json({ success: true, data: friendRequest });
};

// GET /api/users/requests
export const getPendingRequests = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.uid;

  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: userId, status: "PENDING" },
    include: {
      sender: {
        select: { id: true, email: true, displayName: true, photoURL: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: requests });
};

// PATCH /api/users/request/:id  { action: "ACCEPT" | "REJECT" }
export const respondToRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.uid;
  const { id } = req.params;
  const { action } = req.body as { action: "ACCEPT" | "REJECT" };

  const friendRequest = await prisma.friendRequest.findUnique({
    where: { id },
  });

  if (!friendRequest || friendRequest.receiverId !== userId) {
    res.status(404).json({ success: false, message: "Request not found" });
    return;
  }

  if (friendRequest.status !== "PENDING") {
    res
      .status(400)
      .json({ success: false, message: "Request already responded to" });
    return;
  }

  if (action !== "ACCEPT" && action !== "REJECT") {
    res.status(400).json({ success: false, message: "action must be ACCEPT or REJECT" });
    return;
  }

  if (action === "ACCEPT") {
    await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id },
        data: { status: "ACCEPTED" },
      }),
      prisma.friendship.createMany({
        data: [
          { userId: friendRequest.senderId, friendId: friendRequest.receiverId },
          { userId: friendRequest.receiverId, friendId: friendRequest.senderId },
        ],
        skipDuplicates: true,
      }),
    ]);

    const [accepter, sender] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, displayName: true, photoURL: true },
      }),
      prisma.user.findUnique({
        where: { id: friendRequest.senderId },
        select: { id: true, email: true, displayName: true, photoURL: true },
      }),
    ]);
    if (accepter) {
      emitToUser(friendRequest.senderId, "friend_accepted", {
        requestId: id,
        contact: accepter,
      });
    }
    if (sender) {
      emitToUser(userId, "friend_accepted", {
        requestId: id,
        contact: sender,
      });
    }
  } else {
    await prisma.friendRequest.update({
      where: { id },
      data: { status: "REJECTED" },
    });
  }

  res.json({ success: true, message: `Request ${action.toLowerCase()}ed` });
};

// GET /api/users/contacts
export const getContacts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.uid;

  const friendships = await prisma.friendship.findMany({
    where: { userId },
    include: {
      friend: {
        select: { id: true, email: true, displayName: true, photoURL: true },
      },
    },
  });

  const contacts = friendships.map((f) => ({
    ...f.friend,
    isOnline: isUserOnline(f.friend.id),
  }));
  res.json({ success: true, data: contacts });
};
