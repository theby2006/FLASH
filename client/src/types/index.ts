// Mirrors shared/types/index.ts for the client

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

// Socket payloads
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

export interface PresencePayload {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}
