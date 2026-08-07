import { requireSession } from "@/lib/auth";
import { handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// Marks all of the user's notifications as read.
export const POST = handle(async () => {
  const session = await requireSession();
  await prisma.notification.updateMany({ where: { userId: session.id, isRead: false }, data: { isRead: true } });
  return { updated: true };
});
