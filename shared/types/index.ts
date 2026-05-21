// ─── Shared TypeScript Types ───────────────────────────────────────────────
// Used by both client and server to stay in sync

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  sender: User;
  receiver: User;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  friend: User;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string;
  photoURL?: string;
  createdAt: string;
  members: GroupMember[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface GroupMember {
  userId: string;
  conversationId: string;
  role: "ADMIN" | "MEMBER";
  joinedAt: string;
  user: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "FILE";
  createdAt: string;
  readBy: string[];
  sender: User;
}

// ─── Socket Event Payloads ─────────────────────────────────────────────────

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type: Message["type"];
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  displayName: string;
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface PresencePayload {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

// ─── API Response Wrappers ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
