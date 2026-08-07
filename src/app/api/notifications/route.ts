import { requireSession } from "@/lib/auth";
import { handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = handle(async () => {
  const session = await requireSession();

  const notifications = await prisma.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, type: true, title: true, body: true, link: true, isRead: true, createdAt: true },
  });

  const unread = notifications.filter((n) => !n.isRead).length;

  return { items: notifications, unread };
});
