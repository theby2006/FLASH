import { z } from "zod";

export const friendRequestBodySchema = z.object({
  receiverId: z.string().min(1, "receiverId required"),
});

export const respondRequestBodySchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
});

export const dmBodySchema = z.object({
  friendId: z.string().min(1, "friendId required"),
});

export const createGroupBodySchema = z.object({
  name: z.string().min(1, "name required").max(100),
  memberIds: z.array(z.string().min(1)).min(1, "At least one member required"),
});

export const addMemberBodySchema = z.object({
  userId: z.string().min(1, "userId required"),
});

export const searchQuerySchema = z.object({
  email: z.string().email("Valid email required"),
});
