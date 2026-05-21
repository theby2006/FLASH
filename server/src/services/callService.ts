import { CallStatus } from "@prisma/client";
import { prisma } from "../config/db";
import type { CallType } from "../socket/callHandlers";

export async function recordCallInvite(params: {
  callId: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  callType: CallType;
}) {
  return prisma.callSession.upsert({
    where: { id: params.callId },
    create: {
      id: params.callId,
      conversationId: params.conversationId,
      callerId: params.callerId,
      calleeId: params.calleeId,
      callType: params.callType,
      status: "RINGING",
    },
    update: {
      status: "RINGING",
      endedAt: null,
    },
  });
}

export async function updateCallStatus(
  callId: string,
  status: CallStatus
) {
  return prisma.callSession.updateMany({
    where: { id: callId },
    data: {
      status,
      ...(status === "ENDED" ||
      status === "REJECTED" ||
      status === "MISSED" ||
      status === "FAILED"
        ? { endedAt: new Date() }
        : {}),
    },
  });
}
