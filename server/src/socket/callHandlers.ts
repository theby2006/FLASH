import { Server, Socket } from "socket.io";
import { prisma } from "../config/db";
import { emitToUser } from "./socketNotifier";

export type CallType = "audio" | "video";

export interface CallInvitePayload {
  callId: string;
  conversationId: string;
  callType: CallType;
  toUserId: string;
  fromDisplayName: string;
}

async function canUsersCallInConversation(
  callerId: string,
  calleeId: string,
  conversationId: string
): Promise<boolean> {
  if (callerId === calleeId) return false;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { isGroup: true },
  });
  if (!conversation || conversation.isGroup) return false;

  const [callerMember, calleeMember] = await Promise.all([
    prisma.groupMember.findUnique({
      where: {
        userId_conversationId: { userId: callerId, conversationId },
      },
    }),
    prisma.groupMember.findUnique({
      where: {
        userId_conversationId: { userId: calleeId, conversationId },
      },
    }),
  ]);

  if (!callerMember || !calleeMember) return false;

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: callerId, friendId: calleeId },
        { userId: calleeId, friendId: callerId },
      ],
    },
  });

  return !!friendship;
}

export const registerCallHandlers = (
  _io: Server,
  socket: Socket,
  userId: string
) => {
  const forwardToUser = (
    targetUserId: string,
    event: string,
    payload: Record<string, unknown>
  ) => {
    emitToUser(targetUserId, event, { ...payload, fromUserId: userId });
  };

  socket.on("call_invite", async (payload: CallInvitePayload) => {
    const { callId, conversationId, callType, toUserId, fromDisplayName } =
      payload ?? {};

    if (!callId || !conversationId || !toUserId || !callType) return;

    const allowed = await canUsersCallInConversation(
      userId,
      toUserId,
      conversationId
    );
    if (!allowed) {
      socket.emit("call_error", {
        callId,
        message: "Cannot call this user",
      });
      return;
    }

    forwardToUser(toUserId, "call_incoming", {
      callId,
      conversationId,
      callType,
      fromDisplayName: fromDisplayName ?? "Someone",
    });
  });

  socket.on(
    "call_offer",
    async (payload: {
      callId: string;
      conversationId: string;
      toUserId: string;
      sdp: unknown;
    }) => {
      const { callId, conversationId, toUserId, sdp } = payload ?? {};
      if (!callId || !toUserId || !sdp) return;

      const allowed = await canUsersCallInConversation(
        userId,
        toUserId,
        conversationId
      );
      if (!allowed) return;

      forwardToUser(toUserId, "call_offer", { callId, conversationId, sdp });
    }
  );

  socket.on(
    "call_answer",
    async (payload: {
      callId: string;
      conversationId: string;
      toUserId: string;
      sdp: unknown;
    }) => {
      const { callId, conversationId, toUserId, sdp } = payload ?? {};
      if (!callId || !toUserId || !sdp) return;

      const allowed = await canUsersCallInConversation(
        userId,
        toUserId,
        conversationId
      );
      if (!allowed) return;

      forwardToUser(toUserId, "call_answer", { callId, conversationId, sdp });
    }
  );

  socket.on(
    "call_ice_candidate",
    async (payload: {
      callId: string;
      conversationId: string;
      toUserId: string;
      candidate: unknown;
    }) => {
      const { callId, conversationId, toUserId, candidate } = payload ?? {};
      if (!callId || !toUserId || !candidate) return;

      const allowed = await canUsersCallInConversation(
        userId,
        toUserId,
        conversationId
      );
      if (!allowed) return;

      forwardToUser(toUserId, "call_ice_candidate", {
        callId,
        conversationId,
        candidate,
      });
    }
  );

  socket.on(
    "call_reject",
    (payload: { callId: string; toUserId: string }) => {
      const { callId, toUserId } = payload ?? {};
      if (!callId || !toUserId) return;
      forwardToUser(toUserId, "call_reject", { callId });
    }
  );

  socket.on(
    "call_end",
    (payload: { callId: string; toUserId: string }) => {
      const { callId, toUserId } = payload ?? {};
      if (!callId || !toUserId) return;
      forwardToUser(toUserId, "call_end", { callId });
    }
  );

};
