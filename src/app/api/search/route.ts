import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { NET_MISSIONS } from "@/lib/net/missions";

const schema = z.object({ q: z.string().trim().min(1).max(80) });

export type SearchResults = {
  courses: { slug: string; title: string; icon: string | null; color: string; difficulty: string }[];
  lessons: {
    slug: string;
    title: string;
    moduleSlug: string;
    courseSlug: string;
    courseTitle: string;
    color: string;
  }[];
  games: { slug: string; name: string; icon: string; color: string }[];
  netMissions: { slug: string; title: string; short: string; difficulty: string }[];
  achievements: { key: string; name: string; description: string; icon: string; rarity: string }[];
  projects: { id: string; title: string; missionSlug: string | null }[];
};

export async function GET(req: Request) {
  const session = await requireSession();

  const url = new URL(req.url);
  const parsed = schema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) return ok({ results: null });

  const q = parsed.data.q;
  const contains = { contains: q, mode: "insensitive" as const };

  const [courses, lessons, games, achievements, projects] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED", OR: [{ title: contains }, { description: contains }] },
      take: 5,
      select: { slug: true, title: true, icon: true, color: true, difficulty: true },
      orderBy: { order: "asc" },
    }),
    prisma.lesson.findMany({
      where: { OR: [{ title: contains }, { description: contains }], course: { status: "PUBLISHED" } },
      take: 5,
      select: {
        slug: true,
        title: true,
        module: { select: { slug: true } },
        course: { select: { slug: true, title: true, color: true } },
      },
    }),
    prisma.game.findMany({
      where: { isActive: true, OR: [{ name: contains }, { description: contains }] },
      take: 5,
      select: { slug: true, name: true, icon: true, color: true },
    }),
    prisma.achievement.findMany({
      where: { isActive: true, OR: [{ name: contains }, { description: contains }] },
      take: 5,
      select: { key: true, name: true, description: true, icon: true, rarity: true },
    }),
    prisma.networkProject.findMany({
      where: { userId: session.id, isArchived: false, title: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, title: true, missionSlug: true },
    }),
  ]);

  const netMissions = NET_MISSIONS.filter((m) => {
    const hay = `${m.title} ${m.short} ${m.difficulty}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  })
    .slice(0, 5)
    .map((m) => ({ slug: m.slug, title: m.title, short: m.short, difficulty: m.difficulty }));

  const results: SearchResults = {
    courses,
    lessons: lessons.flatMap((l) => {
      if (!l.course) return [];
      return [
        {
          slug: l.slug,
          title: l.title,
          moduleSlug: l.module.slug,
          courseSlug: l.course.slug,
          courseTitle: l.course.title,
          color: l.course.color,
        },
      ];
    }),
    games,
    netMissions,
    achievements,
    projects,
  };

  return ok({ results });
}
