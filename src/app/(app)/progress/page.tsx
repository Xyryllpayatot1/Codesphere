import Link from "next/link";
import { ArrowRight, Award, BookCheck, Flame, Gamepad2, Sparkles, TrendingUp, Trophy } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelFromXp, levelTitle } from "@/lib/engine/xp";
import { Progress } from "@/components/ui/progress";
import { TRACKS, trackForCourse } from "@/lib/tracks";
import { pathById } from "@/lib/onboarding";
import { FeatureIcon } from "@/components/shared/feature-icon";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const session = await requireSession();
  const userId = session.id;

  const [user, settings, publishedCourses, enrollments, lessonsDone, gamesBeaten, recentAchievements, netMissions] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { xp: true, streak: true, longestStreak: true } }),
      prisma.userSetting.findUnique({ where: { userId }, select: { learningPath: true, dailyGoalMinutes: true } }),
      prisma.course.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: { id: true, language: true, category: { select: { slug: true } } },
      }),
      prisma.enrollment.findMany({ where: { userId }, select: { courseId: true, status: true } }),
      prisma.lessonProgress.count({ where: { userId, status: "COMPLETED" } }),
      prisma.gameProgress.count({ where: { userId, status: { in: ["BEATEN", "PERFECT"] } } }),
      prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { earnedAt: "desc" },
        take: 8,
        select: {
          earnedAt: true,
          achievement: { select: { name: true, description: true, icon: true, rarity: true } },
        },
      }),
      prisma.networkMissionProgress.count({ where: { userId, status: "COMPLETED" } }),
    ]);

  const lv = levelFromXp(user?.xp ?? 0);
  const userTrack = (settings?.learningPath ? pathById(settings.learningPath)?.track : null) ?? "web";

  const enrollmentByCourse = new Map(enrollments.map((e) => [e.courseId, e.status]));
  const trackProgress = TRACKS.map((t) => {
    const courses = publishedCourses.filter((c) => trackForCourse(c) === t.id);
    const completed = courses.filter((c) => enrollmentByCourse.get(c.id) === "COMPLETED").length;
    return { ...t, total: courses.length, completed, percent: courses.length ? Math.round((completed / courses.length) * 100) : 0 };
  });

  const orderedTracks = [...trackProgress.filter((t) => t.id === userTrack), ...trackProgress.filter((t) => t.id !== userTrack)];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <TrendingUp className="h-6 w-6 text-primary" /> Progress
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you&apos;ve built so far — XP, tracks, missions and achievements.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Level {lv.level}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{levelTitle(lv.level)}</p>
          <Progress value={Math.round(lv.progress * 100)} className="mt-3 h-2" />
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">
            {lv.current.toLocaleString()} / {lv.needed.toLocaleString()} XP
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-primary" /> Total XP
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">{(user?.xp ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="h-4 w-4 text-orange-500" /> Streak
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {user?.streak ?? 0}
            <span className="text-sm font-normal text-muted-foreground"> / {user?.longestStreak ?? 0} best</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BookCheck className="h-4 w-4 text-primary" /> Lessons completed
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">{lessonsDone}</p>
        </div>
      </div>

      <section aria-label="Track progress">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> Your tracks
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {orderedTracks.map((t) => (
            <Link
              key={t.id}
              href="/learn"
              className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${t.color}1a`, color: t.color }}
                  >
                    <FeatureIcon name={t.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold leading-tight">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.tagline}</p>
                  </div>
                </div>
                {t.id === userTrack && (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Your path
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={t.percent} className="h-2 flex-1" />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {t.completed}/{t.total || 0}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t.total === 0
                  ? "Courses coming soon"
                  : t.percent === 100
                    ? "Track complete — amazing!"
                    : t.id === userTrack
                      ? "Keep going — this is your path."
                      : "Explore when you're ready."}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Gamepad2 className="h-4 w-4 text-primary" /> Games beaten
            </p>
            <Link href="/games" className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
              Play <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{gamesBeaten}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Networking missions
            </p>
            <Link href="/networking" className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
              Open lab <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{netMissions}</p>
        </div>
      </div>

      <section aria-label="Achievements">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Award className="h-4 w-4 text-primary" /> Recent achievements
          </h2>
          <Link href="/achievements" className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
            All achievements <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentAchievements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm font-medium">No achievements yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Finish lessons, keep streaks and beat games — achievements unlock automatically.
            </p>
            <Link
              href="/learn"
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Start learning <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentAchievements.map((ua) => (
              <div key={ua.achievement.name + ua.earnedAt.toISOString()} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-2xl leading-none">{ua.achievement.icon}</p>
                <p className="mt-2 text-sm font-semibold leading-tight">{ua.achievement.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ua.achievement.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
