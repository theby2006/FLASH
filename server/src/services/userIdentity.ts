import { prisma } from "../config/db";

/** Map Firebase uid to the Prisma user id used in conversations and sockets. */
export const resolveDbUserId = async (
  firebaseUid: string,
  email: string
): Promise<string> => {
  const byId = await prisma.user.findUnique({
    where: { id: firebaseUid },
    select: { id: true },
  });
  if (byId) return byId.id;

  if (email) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  return firebaseUid;
};
