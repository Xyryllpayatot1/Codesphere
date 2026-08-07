import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isFeatureUnlocked } from "@/lib/engine/levels";

const PERIODS = ["daily", "weekly", "monthly", "all"] as const;
const querySchema = z.object({ period: z.enum(PERIODS).default("daily") });

function startOfLocalDay(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfLocalWeek(now: Date = new Date()): Date {
  const d = startOfLocalDay(now);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

function startOfLocalMonth(now: Date = new Date()): Date {
  const d = startOfLocalDay(now);
  d.setDate(1);
  return d;
}

export const GET = handle(async (req) => {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { level: true, xp: true, name: true, username: true, avatarUrl: true } });
  const level = user?.level ?? 1;
  if (!isFeatureUnlocked("leaderboards", level)) throw new ApiError("Leaderboards unlock at level 3", 403);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  const period = parsed.success ? parsed.data.period : "daily";

  type Entry = { rank: number; userId: string; name: string; username: string; avatarUrl: string | null; xp: number; level: number };

  if (period === "all") {
    const rows = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      orderBy: { xp: "desc" },
      select: { id: true, name: true, username: true, avatarUrl: true, xp: true, level: true },
      take: 100,
    });
    const entries: Entry[] = rows.map((r, i) => ({ rank: i + 1, userId: r.id, name: r.name, username: r.username, avatarUrl: r.avatarUrl, xp: r.xp, level: r.level }));
    let myRank: number | null = null;
    if (user) {
      myRank = (await prisma.user.count({ where: { role: { not: "ADMIN" }, xp: { gt: user.xp } } })) + 1;
    }
    return { period, entries, me: user ? { rank: myRank, xp: user.xp } : null };
  }

  const start = period === "daily" ? startOfLocalDay() : period === "weekly" ? startOfLocalWeek() : startOfLocalMonth();

  const grouped = await prisma.xpTransaction.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: start } },
    _sum: { amount: true },
  });

  const byUser = new Map(grouped.map((g) => [g.userId, g._sum.amount ?? 0]));
  const userIds = [...byUser.keys()];

  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds }, role: { not: "ADMIN" } },
        select: { id: true, name: true, username: true, avatarUrl: true, xp: true, level: true },
      })
    : [];

  const ranked = users
    .map((u) => ({ ...u, userId: u.id, xp: byUser.get(u.id) ?? 0 }))
    .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name))
    .slice(0, 100)
    .map((u, i) => ({ rank: i + 1, userId: u.userId, name: u.name, username: u.username, avatarUrl: u.avatarUrl, xp: u.xp, level: u.level }));

  const myPeriodXp = byUser.get(session.id) ?? 0;
  const myRank = myPeriodXp > 0 ? ranked.findIndex((e) => e.userId === session.id) : -1;

  return {
    period,
    entries: ranked,
    me: user
      ? {
          rank: myRank >= 0 ? myRank + 1 : ranked.length + 1,
          xp: myPeriodXp,
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl,
          level,
        }
      : null,
  };
});
