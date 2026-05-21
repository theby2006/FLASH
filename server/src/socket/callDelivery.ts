import { Server } from "socket.io";
import { prisma } from "../config/db";
import { emitToUser, getOnlineUserIds } from "./socketNotifier";
import { agentDebugLog } from "../utils/agentDebugLog";

export async function resolveCalleeInConversation(
  conversationId: string,
  callerId: string,
  hintedCalleeId: string
): Promise<string | null> {
  const members = await prisma.groupMember.findMany({
    where: { conversationId },
    select: { userId: true },
  });

  if (members.length !== 2) return null;

  const other = members.find((m) => m.userId !== callerId);
  if (!other) return null;

  if (other.userId === hintedCalleeId) return hintedCalleeId;
  return other.userId;
}

/** Deliver call_incoming to callee (socket map + conversation room). */
export async function deliverCallIncoming(
  io: Server,
  callerId: string,
  calleeId: string,
  conversationId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  return deliverCallSignal(
    io,
    callerId,
    calleeId,
    conversationId,
    "call_incoming",
    payload
  );
}

/**
 * Deliver call signaling in a 1:1 chat.
 * Uses direct user map + any other participant in the conversation room
 * (fixes socket userId ≠ DB member id mismatches).
 */
export async function deliverCallSignal(
  io: Server,
  fromUserId: string,
  toUserId: string,
  conversationId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const fullPayload = { ...payload, fromUserId };

  const viaDirectMap = emitToUser(toUserId, event, fullPayload);
  let delivered = viaDirectMap;
  const roomRecipients: string[] = [];

  const roomSockets = await io.in(conversationId).fetchSockets();
  for (const s of roomSockets) {
    const uid = (s.data as { userId?: string }).userId;
    if (uid && uid !== fromUserId) {
      s.emit(event, fullPayload);
      delivered = true;
      if (!roomRecipients.includes(uid)) roomRecipients.push(uid);
    }
  }

  if (!delivered && event === "call_incoming") {
    agentDebugLog(
      "callDelivery.ts:deliverCallSignal",
      "call delivery failed — diagnostics",
      {
        fromUserId,
        toUserId,
        conversationId,
        onlineUserIds: getOnlineUserIds(),
        roomUserIds: roomSockets.map(
          (s) => (s.data as { userId?: string }).userId ?? "?"
        ),
        roomSize: roomSockets.length,
      },
      "H1"
    );
  } else if (event === "call_incoming") {
    agentDebugLog(
      "callDelivery.ts:deliverCallSignal",
      "call_incoming delivered",
      {
        fromUserId,
        toUserId,
        conversationId,
        roomRecipients,
        viaDirectMap,
      },
      "H1"
    );
  }

  return delivered;
}
