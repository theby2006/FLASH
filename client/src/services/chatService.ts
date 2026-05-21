import api from "./api";
import { Conversation, Message } from "../types";

export const getConversations = async (): Promise<Conversation[]> => {
  const res = await api.get("/api/chats");
  return res.data.data;
};

export const getOrCreateDM = async (friendId: string): Promise<Conversation> => {
  const res = await api.post("/api/chats/dm", { friendId });
  return res.data.data;
};

export const getMessages = async (
  conversationId: string,
  page = 1,
  limit = 30
): Promise<{ data: Message[]; hasMore: boolean; total: number }> => {
  const res = await api.get(
    `/api/chats/${conversationId}/messages?page=${page}&limit=${limit}`
  );
  return res.data.data;
};

export const createGroup = async (
  name: string,
  memberIds: string[]
): Promise<Conversation> => {
  const res = await api.post("/api/groups", { name, memberIds });
  return res.data.data;
};

export const getGroupInfo = async (groupId: string): Promise<Conversation> => {
  const res = await api.get(`/api/groups/${groupId}`);
  return res.data.data;
};

export const addGroupMember = async (
  groupId: string,
  userId: string
): Promise<void> => {
  await api.post(`/api/groups/${groupId}/members`, { userId });
};

export const removeGroupMember = async (
  groupId: string,
  userId: string
): Promise<void> => {
  await api.delete(`/api/groups/${groupId}/members/${userId}`);
};
