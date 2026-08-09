import { prisma } from "@/lib/prisma";
import { levelFromXp, levelTitle } from "@/lib/engine/xp";
import { todayKey, fromDateKey } from "@/lib/utils";
import { isReleaseSeen } from "@/lib/services/releases";
import type { LatestReleaseView } from "@/components/dashboard/whats-new-card";

export type DashboardData = {
  userName: string;
  xp: number;
  streak: number;
  longestStreak: number;
  level: number;
  levelTitle: string;
  levelCurrent: number;
  levelNeeded: number;
  levelProgress: number;
  dailyGoal: number;
  todayMinutes: number;
  stats: { lessons: number; courses: number; achievements: number; projects: number };
  plan: PlanRow[];
  continueItem: ContinueItem | null;
  activities: ActivityRow[];
  chart: { day: string; minutes: number }[];
  latestRelease: LatestReleaseView | null;
};

export type PlanRow = {
  id: string;
  date: Date;
  status: string;
  priority: number;
  reason: string;
  lesson: {
    id: string;
    title: string;
    slug: string;
    estimatedMinutes: number;
    moduleSlug: string;
    courseSlug: string;
    courseTitle: string;
    color: string;
  };
};

export type ContinueItem = {
  id: string;
  title: string;
  slug: string;
  progress: number;
  moduleSlug: string;
  courseSlug: string;
  courseTitle: string;
  color: string;
};

export type ActivityRow = {
  id: string;
  type: string;
  createdAt: Date;
  data: unknown;
  course: { title: string; slug: string } | null;
  lesson: { title: string; slug: string; moduleSlug: string } | null;
};

export async function loadDashboardData(userId: string): Promise<DashboardData> {
  const today = todayKey();
  const startDay = fromDateKey(todayKey(-13));

  const planItems = await prisma.studyPlanItem.findMany({
    where: { userId, date: { gte: fromDateKey(today) } },
    orderBy: [{ date: "asc" }, { priority: "asc" }],
    take: 40,
    select: { id: true, date: true, status: true, priority: true, reason: true, lessonId: true },
  });

  const lessonIds = [...new Set(planItems.map((p) => p.lessonId))];

  const [user, settings, stats, activities, sessions, continueItems, lessons] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, xp: true, streak: true, longestStreak: true } }),
    prisma.userSetting.findUnique({ where: { userId } }),
    Promise.all([
      prisma.lessonProgress.count({ where: { userId, status: "COMPLETED" } }),
      prisma.enrollment.count({ where: { userId, status: "COMPLETED" } }),
      prisma.userAchievement.count({ where: { userId } }),
      prisma.projectSubmission.count({ where: { userId, status: "APPROVED" } }),
    ]),
    prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        type: true,
        createdAt: true,
        data: true,
        course: { select: { title: true, slug: true } },
        lesson: { select: { title: true, slug: true, module: { select: { slug: true } } } },
      },
    }),
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: startDay } },
      select: { startedAt: true, durationSeconds: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, status: { not: "COMPLETED" }, progressPercent: { gt: 0 } },
      orderBy: { lastAccessedAt: "desc" },
      take: 1,
      select: {
        progressPercent: true,
        lesson: {
          select: {
            id: true,
            title: true,
            slug: true,
            module: { select: { slug: true } },
            course: { select: { slug: true, title: true, color: true } },
          },
        },
      },
    }),
    lessonIds.length > 0
      ? prisma.lesson.findMany({
          where: { id: { in: lessonIds } },
          select: {
            id: true,
            title: true,
            slug: true,
            estimatedMinutes: true,
            module: { select: { slug: true } },
            course: { select: { slug: true, title: true, color: true } },
          },
        })
      : [],
  ]);

  const latestReleaseRow = await prisma.release.findFirst({
    where: { isPublished: true },
    orderBy: { releaseDate: "desc" },
    select: {
      id: true,
      version: true,
      title: true,
      summary: true,
      releaseDate: true,
      coverImage: { select: { id: true, url: true, filename: true, mimeType: true, size: true } },
    },
  });

  const latestRelease: LatestReleaseView | null = latestReleaseRow
    ? { ...latestReleaseRow, seen: await isReleaseSeen(userId, latestReleaseRow.id) }
    : null;

  const lv = levelFromXp(user?.xp ?? 0);
  const lessonById = new Map(lessons.map((l) => [l.id, l]));

  const plan: PlanRow[] = planItems.flatMap((p) => {
    const lesson = lessonById.get(p.lessonId);
    if (!lesson) return [];
    return [
      {
        id: p.id,
        date: p.date,
        status: p.status,
        priority: p.priority,
        reason: p.reason,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          estimatedMinutes: lesson.estimatedMinutes,
          moduleSlug: lesson.module.slug,
          courseSlug: lesson.course?.slug ?? "",
          courseTitle: lesson.course?.title ?? "Course",
          color: lesson.course?.color ?? "#6366f1",
        },
      },
    ];
  });

  const first = continueItems[0];
  const continueItem: ContinueItem | null = first
    ? {
        id: first.lesson.id,
        title: first.lesson.title,
        slug: first.lesson.slug,
        progress: first.progressPercent,
        moduleSlug: first.lesson.module.slug,
        courseSlug: first.lesson.course?.slug ?? "",
        courseTitle: first.lesson.course?.title ?? "Course",
        color: first.lesson.course?.color ?? "#6366f1",
      }
    : null;

  return {
    userName: user?.name ?? "Learner",
    xp: user?.xp ?? 0,
    streak: user?.streak ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    level: lv.level,
    levelTitle: levelTitle(lv.level),
    levelCurrent: lv.current,
    levelNeeded: lv.needed,
    levelProgress: lv.progress,
    dailyGoal: settings?.dailyGoalMinutes ?? 30,
    todayMinutes: Math.round(
      sessions.filter((s) => s.startedAt >= fromDateKey(today)).reduce((sum, s) => sum + s.durationSeconds, 0) / 60
    ),
    stats: { lessons: stats[0], courses: stats[1], achievements: stats[2], projects: stats[3] },
    plan,
    continueItem,
    activities: activities.map((a) => ({
      id: a.id,
      type: a.type,
      createdAt: a.createdAt,
      data: a.data,
      course: a.course,
      lesson: a.lesson ? { title: a.lesson.title, slug: a.lesson.slug, moduleSlug: a.lesson.module.slug } : null,
    })),
    chart: buildChart(sessions),
    latestRelease,
  };
}

function buildChart(sessions: { startedAt: Date; durationSeconds: number }[]) {
  const labels = new Map<string, string>();
  const byKey = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const key = todayKey(-13 + i);
    const [, m, d] = key.split("-");
    labels.set(key, `${Number(m)}/${Number(d)}`);
    byKey.set(key, 0);
  }
  for (const s of sessions) {
    const y = s.startedAt.getFullYear();
    const m = String(s.startedAt.getMonth() + 1).padStart(2, "0");
    const d = String(s.startedAt.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    if (byKey.has(key)) byKey.set(key, byKey.get(key)! + s.durationSeconds);
  }
  return [...byKey.entries()].map(([key, seconds]) => ({
    day: labels.get(key) ?? key,
    minutes: Math.round(seconds / 60),
  }));
}
