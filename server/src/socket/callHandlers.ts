import { Server, Socket } from "socket.io";
import { prisma } from "../config/db";
// Calls: DB record first, then Socket.io signaling to peer
import { emitToUser, isUserOnline } from "./socketNotifier";
import {
  recordCallInvite,
  updateCallStatus,
} from "../services/callService";

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

  // 1:1 DM: both must be in the conversation (friends when DM was created)
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
  ): boolean => {
    return emitToUser(targetUserId, event, { ...payload, fromUserId: userId });
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

    await recordCallInvite({
      callId,
      conversationId,
      callerId: userId,
      calleeId: toUserId,
      callType,
    });

    let delivered = forwardToUser(toUserId, "call_incoming", {
      callId,
      conversationId,
      callType,
      fromDisplayName: fromDisplayName ?? "Someone",
    });

    // Brief retry — socket may register online a moment after connect
    if (!delivered) {
      await new Promise((r) => setTimeout(r, 600));
      if (isUserOnline(toUserId)) {
        delivered = forwardToUser(toUserId, "call_incoming", {
          callId,
          conversationId,
          callType,
          fromDisplayName: fromDisplayName ?? "Someone",
        });
      }
    }

    if (!delivered) {
      await updateCallStatus(callId, "MISSED");
      socket.emit("call_unreachable", {
        callId,
        message: "User is offline",
      });
      return;
    }

    socket.emit("call_ringing", { callId, delivered: true });
  });

  socket.on(
    "call_accept",
    async (payload: {
      callId: string;
      conversationId: string;
      toUserId: string;
    }) => {
      const { callId, conversationId, toUserId } = payload ?? {};
      if (!callId || !conversationId || !toUserId) return;

      const allowed = await canUsersCallInConversation(
        userId,
        toUserId,
        conversationId
      );
      if (!allowed) return;

      await updateCallStatus(callId, "ACCEPTED");
      forwardToUser(toUserId, "call_accept", { callId, conversationId });
    }
  );

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
    async (payload: { callId: string; toUserId: string; reason?: string }) => {
      const { callId, toUserId, reason } = payload ?? {};
      if (!callId || !toUserId) return;
      await updateCallStatus(callId, reason === "busy" ? "FAILED" : "REJECTED");
      if (reason === "busy") {
        forwardToUser(toUserId, "call_busy", { callId });
      } else {
        forwardToUser(toUserId, "call_reject", { callId });
      }
    }
  );

  socket.on(
    "call_end",
    async (payload: { callId: string; toUserId: string }) => {
      const { callId, toUserId } = payload ?? {};
      if (!callId || !toUserId) return;
      const existing = await prisma.callSession.findUnique({
        where: { id: callId },
        select: { status: true },
      });
      await updateCallStatus(
        callId,
        existing?.status === "RINGING" ? "MISSED" : "ENDED"
      );
      forwardToUser(toUserId, "call_end", { callId });
    }
  );

};
