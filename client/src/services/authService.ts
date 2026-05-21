import api from "./api";
import type { User } from "../types";

export const loginWithBackend = async (): Promise<User> => {
  const res = await api.post("/api/auth/login");
  return res.data.data as User;
};
