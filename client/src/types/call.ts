export type CallType = "audio" | "video";

export type CallStatus =
  | "idle"
  | "outgoing"
  | "incoming"
  | "connecting"
  | "active"
  | "ended";

export interface CallSession {
  callId: string;
  conversationId: string;
  callType: CallType;
  remoteUserId: string;
  remoteDisplayName: string;
  isInitiator: boolean;
}
