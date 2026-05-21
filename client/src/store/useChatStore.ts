import { create } from "zustand";
import type { Conversation, Message, User, FriendRequest } from "../types";

interface ChatStore {
  // Conversations
  conversations: Conversation[];
  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateLastMessage: (conversationId: string, message: Message) => void;

  // Active conversation
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Messages per conversation
  messages: Record<string, Message[]>;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  prependMessages: (conversationId: string, msgs: Message[]) => void;
  addMessage: (conversationId: string, msg: Message) => void;

  // Contacts
  contacts: User[];
  setContacts: (users: User[]) => void;

  // Friend requests
  pendingRequests: FriendRequest[];
  setPendingRequests: (reqs: FriendRequest[]) => void;
  removePendingRequest: (requestId: string) => void;

  // Online presence
  onlineUsers: Set<string>;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;

  // Typing
  typingUsers: Record<string, { userId: string; displayName: string }[]>;
  setTyping: (convId: string, userId: string, displayName: string) => void;
  clearTyping: (convId: string, userId: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  setConversations: (convs) => set({ conversations: convs }),
  addConversation: (conv) =>
    set((s) => ({
      conversations: [conv, ...s.conversations.filter((c) => c.id !== conv.id)],
    })),
  updateLastMessage: (conversationId, message) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: message } : c
      ),
    })),

  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  messages: {},
  setMessages: (conversationId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [conversationId]: msgs } })),
  prependMessages: (conversationId, msgs) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...msgs, ...(s.messages[conversationId] ?? [])],
      },
    })),
  addMessage: (conversationId, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] ?? []), msg],
      },
    })),

  contacts: [],
  setContacts: (users) => set({ contacts: users }),

  pendingRequests: [],
  setPendingRequests: (reqs) => set({ pendingRequests: reqs }),
  removePendingRequest: (requestId) =>
    set((s) => ({
      pendingRequests: s.pendingRequests.filter((r) => r.id !== requestId),
    })),

  onlineUsers: new Set(),
  setUserOnline: (userId) =>
    set((s) => ({ onlineUsers: new Set([...s.onlineUsers, userId]) })),
  setUserOffline: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),

  typingUsers: {},
  setTyping: (convId, userId, displayName) =>
    set((s) => {
      const existing = s.typingUsers[convId] ?? [];
      const filtered = existing.filter((u) => u.userId !== userId);
      return {
        typingUsers: {
          ...s.typingUsers,
          [convId]: [...filtered, { userId, displayName }],
        },
      };
    }),
  clearTyping: (convId, userId) =>
    set((s) => ({
      typingUsers: {
        ...s.typingUsers,
        [convId]: (s.typingUsers[convId] ?? []).filter(
          (u) => u.userId !== userId
        ),
      },
    })),
}));
