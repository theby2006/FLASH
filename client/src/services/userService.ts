import api from "./api";
import type { User, FriendRequest } from "../types";

export const searchUserByEmail = async (email: string): Promise<User | null> => {
  const res = await api.get(`/api/users/search?email=${encodeURIComponent(email)}`);
  return res.data.data;
};

export const sendFriendRequest = async (receiverId: string): Promise<void> => {
  await api.post("/api/users/request", { receiverId });
};

export const getPendingRequests = async (): Promise<FriendRequest[]> => {
  const res = await api.get("/api/users/requests");
  return res.data.data;
};

export const respondToRequest = async (
  requestId: string,
  action: "ACCEPT" | "REJECT"
): Promise<void> => {
  await api.patch(`/api/users/request/${requestId}`, { action });
};

export const getContacts = async (): Promise<User[]> => {
  const res = await api.get("/api/users/contacts");
  return res.data.data;
};
