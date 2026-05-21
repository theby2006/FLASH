import { Server, Socket } from "socket.io";
import { prisma } from "../config/db";
// Calls: DB record first, then Socket.io signaling to peer
import {
  recordCallInvite,
  updateCallStatus,
} from "../services/callService";
import {
  deliverCallIncoming,
  deliverCallSignal,
  resolveCalleeInConversation,
} from "./callDelivery";
import { agentDebugLog } from "../utils/agentDebugLog";

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

  // 1:1 DM with both members — sufficient to call (DM creation already requires friendship)
  return true;
}

export const registerCallHandlers = (
  io: Server,
  socket: Socket,
  userId: string
) => {
  const signalToPeer = async (
    conversationId: string,
    hintedPeerId: string,
    event: string,
    payload: Record<string, unknown>
  ) => {
    const peerId =
      (await resolveCalleeInConversation(
        conversationId,
        userId,
        hintedPeerId
      )) ?? hintedPeerId;
    return deliverCallSignal(io, userId, peerId, conversationId, event, payload);
  };

  socket.on(
    "call_invite",
    async (
      payload: CallInvitePayload,
      ack?: (res: {
        ok: boolean;
        delivered?: boolean;
        message?: string;
      }) => void
    ) => {
      const { callId, conversationId, callType, toUserId, fromDisplayName } =
        payload ?? {};

      if (!callId || !conversationId || !toUserId || !callType) {
        ack?.({ ok: false, message: "Invalid call payload" });
        return;
      }

      const calleeId = await resolveCalleeInConversation(
        conversationId,
        userId,
        toUserId
      );

      if (!calleeId) {
        socket.emit("call_error", {
          callId,
          message: "Cannot call this conversation",
        });
        ack?.({ ok: false, message: "Not a 1:1 chat" });
        return;
      }

      const allowed = await canUsersCallInConversation(
        userId,
        calleeId,
        conversationId
      );
      if (!allowed) {
        socket.emit("call_error", {
          callId,
          message: "Cannot call this user",
        });
        ack?.({ ok: false, message: "Not allowed" });
        return;
      }

      await recordCallInvite({
        callId,
        conversationId,
        callerId: userId,
        calleeId,
        callType,
      });

      const incomingPayload = {
        callId,
        conversationId,
        callType,
        fromDisplayName: fromDisplayName ?? "Someone",
      };

      const delivered = await deliverCallIncoming(
        io,
        userId,
        calleeId,
        conversationId,
        incomingPayload
      );

      const deliveryDiag = {
        callId,
        callerId: userId,
        calleeId,
        hintedToUserId: toUserId,
        callType,
        delivered,
      };
      console.log("[Call] invite delivery:", JSON.stringify(deliveryDiag));
      agentDebugLog(
        "callHandlers.ts:call_invite",
        "invite delivery result",
        deliveryDiag,
        "H1"
      );

      if (!delivered) {
        await updateCallStatus(callId, "MISSED");
        socket.emit("call_unreachable", {
          callId,
          message: "Friend is offline — ask them to open FLASH and check Live status",
        });
        ack?.({ ok: false, delivered: false, message: "User offline" });
        return;
      }

      socket.emit("call_ringing", { callId, delivered: true });
      ack?.({ ok: true, delivered: true });
    }
  );

  socket.on(
    "call_accept",
    async (payload: {
      callId: string;
      conversationId: string;
      toUserId: string;
    }) => {
      const { callId, conversationId, toUserId } = payload ?? {};
      if (!callId || !conversationId || !toUserId) return;

      const peerId =
        (await resolveCalleeInConversation(
          conversationId,
          userId,
          toUserId
        )) ?? toUserId;

      const allowed = await canUsersCallInConversation(
        userId,
        peerId,
        conversationId
      );
      if (!allowed) return;

      await updateCallStatus(callId, "ACCEPTED");
      const acceptFwd = await signalToPeer(conversationId, toUserId, "call_accept", {
        callId,
        conversationId,
      });
      agentDebugLog(
        "callHandlers.ts:call_accept",
        "call_accept forwarded",
        { callId, fromUserId: userId, peerId, acceptFwd },
        "H2"
      );
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
      if (!callId || !toUserId || !sdp || !conversationId) return;

      const peerId =
        (await resolveCalleeInConversation(
          conversationId,
          userId,
          toUserId
        )) ?? toUserId;

      const allowed = await canUsersCallInConversation(
        userId,
        peerId,
        conversationId
      );
      if (!allowed) return;

      const offerFwd = await signalToPeer(conversationId, toUserId, "call_offer", {
        callId,
        conversationId,
        sdp,
      });
      agentDebugLog(
        "callHandlers.ts:call_offer",
        "call_offer forwarded",
        { callId, fromUserId: userId, peerId, offerFwd },
        "H2"
      );
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
      if (!callId || !toUserId || !sdp || !conversationId) return;

      const peerId =
        (await resolveCalleeInConversation(
          conversationId,
          userId,
          toUserId
        )) ?? toUserId;

      const allowed = await canUsersCallInConversation(
        userId,
        peerId,
        conversationId
      );
      if (!allowed) return;

      const answerFwd = await signalToPeer(
        conversationId,
        toUserId,
        "call_answer",
        { callId, conversationId, sdp }
      );
      agentDebugLog(
        "callHandlers.ts:call_answer",
        "call_answer forwarded",
        { callId, fromUserId: userId, peerId, answerFwd },
        "H2"
      );
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
      if (!callId || !toUserId || !candidate || !conversationId) return;

      await signalToPeer(conversationId, toUserId, "call_ice_candidate", {
        callId,
        conversationId,
        candidate,
      });
    }
  );

  socket.on(
    "call_reject",
    async (payload: { callId: string; toUserId: string; reason?: string }) => {
      const { callId, toUserId, reason, conversationId } = payload as {
        callId: string;
        toUserId: string;
        reason?: string;
        conversationId?: string;
      };
      if (!callId || !toUserId) return;
      await updateCallStatus(callId, reason === "busy" ? "FAILED" : "REJECTED");
      if (conversationId) {
        const event = reason === "busy" ? "call_busy" : "call_reject";
        await signalToPeer(conversationId, toUserId, event, { callId });
      }
    }
  );

  socket.on(
    "call_end",
    async (payload: { callId: string; toUserId: string; conversationId?: string }) => {
      const { callId, toUserId, conversationId } = payload ?? {};
      if (!callId || !toUserId) return;
      const existing = await prisma.callSession.findUnique({
        where: { id: callId },
        select: { status: true, conversationId: true },
      });
      await updateCallStatus(
        callId,
        existing?.status === "RINGING" ? "MISSED" : "ENDED"
      );
      const convId = conversationId ?? existing?.conversationId;
      if (convId) {
        await signalToPeer(convId, toUserId, "call_end", { callId });
      }
    }
  );

};
