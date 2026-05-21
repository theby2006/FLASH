import { Server } from "socket.io";
import { prisma } from "../config/db";
import { emitToUser } from "./socketNotifier";

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
  const fullPayload = { ...payload, fromUserId: callerId };

  let delivered = emitToUser(calleeId, "call_incoming", fullPayload);

  if (!delivered) {
    await new Promise((r) => setTimeout(r, 500));
    delivered = emitToUser(calleeId, "call_incoming", fullPayload);
  }

  const roomSockets = await io.in(conversationId).fetchSockets();
  for (const s of roomSockets) {
    const uid = (s.data as { userId?: string }).userId;
    if (uid === calleeId) {
      s.emit("call_incoming", fullPayload);
      delivered = true;
    }
  }

  return delivered;
}
