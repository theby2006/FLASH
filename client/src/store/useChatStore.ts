import { create } from "zustand";
import type { Conversation, Message, User, FriendRequest } from "../types";

interface ChatStore {
  conversations: Conversation[];
  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateLastMessage: (conversationId: string, message: Message) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;

  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  messages: Record<string, Message[]>;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  prependMessages: (conversationId: string, msgs: Message[]) => void;
  addMessage: (conversationId: string, msg: Message) => void;
  mergeLatestMessages: (conversationId: string, latest: Message[]) => void;
  markMessagesReadByIds: (
    conversationId: string,
    userId: string,
    messageIds: string[]
  ) => void;

  contacts: User[];
  setContacts: (users: User[]) => void;

  pendingRequests: FriendRequest[];
  setPendingRequests: (reqs: FriendRequest[]) => void;
  addPendingRequest: (req: FriendRequest) => void;
  removePendingRequest: (requestId: string) => void;

  onlineUsers: Set<string>;
  lastSeenByUser: Record<string, string>;
  setUserOnline: (userId: string, lastSeen?: string) => void;
  setUserOffline: (userId: string, lastSeen?: string) => void;

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
      conversations: s.conversations
        .map((c) =>
          c.id === conversationId ? { ...c, lastMessage: message } : c
        )
        .sort((a, b) => {
          const aTime = a.lastMessage?.createdAt ?? a.createdAt;
          const bTime = b.lastMessage?.createdAt ?? b.createdAt;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        }),
    })),
  incrementUnread: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 }
          : c
      ),
    })),
  clearUnread: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
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
    set((s) => {
      const existing = s.messages[conversationId] ?? [];
      if (existing.some((m) => m.id === msg.id)) return s;
      return {
        messages: {
          ...s.messages,
          [conversationId]: [...existing, msg],
        },
      };
    }),
  mergeLatestMessages: (conversationId, latest) =>
    set((s) => {
      const existing = s.messages[conversationId] ?? [];
      if (existing.length === 0) {
        return { messages: { ...s.messages, [conversationId]: latest } };
      }
      const existingIds = new Set(existing.map((m) => m.id));
      const updated = existing.map((ex) => {
        const fresh = latest.find((m) => m.id === ex.id);
        return fresh ? { ...ex, readBy: fresh.readBy } : ex;
      });
      const newOnes = latest.filter((m) => !existingIds.has(m.id));
      const merged = [...updated, ...newOnes].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return { messages: { ...s.messages, [conversationId]: merged } };
    }),
  markMessagesReadByIds: (conversationId, userId, messageIds) =>
    set((s) => {
      const msgs = s.messages[conversationId];
      if (!msgs) return s;
      const idSet = new Set(messageIds);
      return {
        messages: {
          ...s.messages,
          [conversationId]: msgs.map((m) =>
            idSet.has(m.id) && !m.readBy.includes(userId)
              ? { ...m, readBy: [...m.readBy, userId] }
              : m
          ),
        },
      };
    }),

  contacts: [],
  setContacts: (users) => set({ contacts: users }),

  pendingRequests: [],
  setPendingRequests: (reqs) => set({ pendingRequests: reqs }),
  addPendingRequest: (req) =>
    set((s) => {
      if (s.pendingRequests.some((r) => r.id === req.id)) return s;
      return { pendingRequests: [req, ...s.pendingRequests] };
    }),
  removePendingRequest: (requestId) =>
    set((s) => ({
      pendingRequests: s.pendingRequests.filter((r) => r.id !== requestId),
    })),

  onlineUsers: new Set(),
  lastSeenByUser: {},
  setUserOnline: (userId, lastSeen) =>
    set((s) => ({
      onlineUsers: new Set([...s.onlineUsers, userId]),
      lastSeenByUser: lastSeen
        ? { ...s.lastSeenByUser, [userId]: lastSeen }
        : s.lastSeenByUser,
    })),
  setUserOffline: (userId, lastSeen) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.delete(userId);
      return {
        onlineUsers: next,
        lastSeenByUser: lastSeen
          ? { ...s.lastSeenByUser, [userId]: lastSeen }
          : s.lastSeenByUser,
      };
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
