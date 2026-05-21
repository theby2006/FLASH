import { Response } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../types";

// POST /api/auth/login
// Upsert the user in our DB using Firebase verified uid/email
export const loginOrRegister = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { uid, email, name, picture } = req.user!;

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName: name || email.split("@")[0],
      photoURL: picture || null,
    },
    create: {
      id: uid,
      email,
      displayName: name || email.split("@")[0],
      photoURL: picture || null,
    },
  });

  res.status(200).json({ success: true, data: user });
};
