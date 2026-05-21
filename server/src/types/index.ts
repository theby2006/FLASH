import { Request } from "express";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name: string;
    picture: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SocketUser {
  userId: string;
  socketId: string;
}
