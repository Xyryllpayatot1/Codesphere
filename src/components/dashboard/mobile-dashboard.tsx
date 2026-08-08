import Link from "next/link";
import {
  Activity as ActivityIcon,
  ArrowRight,
  Award,
  BookOpen,
  Code2,
  Flame,
  Network,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { QuickSession, ContinueLearningCard } from "@/components/dashboard/quick-session";
import { timeAgo } from "@/lib/utils";
import type { DashboardData } from "@/lib/dashboard-data";

export type NetProjectRow = {
  id: string;
  title: string;
  missionSlug: string | null;
  updatedAt: Date;
  snapshot: { devices?: unknown[]; cables?: unknown[] } | null;
};

function lessonHref(lesson: { courseSlug: string; moduleSlug: string; slug: string }) {
  return `/learn/${lesson.courseSlug}/${lesson.moduleSlug}/${lesson.slug}`;
}

/** Compact, app-like dashboard for mobile. */
export function MobileDashboardView({
  data,
  recentProjects,
  recentLessons,
}: {
  data: DashboardData;
  recentProjects: NetProjectRow[];
  recentLessons: DashboardData["activities"];
}) {
  const firstName = data.userName.split(" ")[0] || "Learner";
  const goalProgress = Math.min(100, Math.round((data.todayMinutes / data.dailyGoal) * 100));
  const lessonActivities = recentLessons.filter((a) => a.lesson);

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-4">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-bold tracking-tight">{firstName}</h1>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Streak" icon={<Flame className="h-4 w-4 text-orange-500" />} value={`${data.streak}d`} />
        <StatCard label="XP" icon={<Zap className="h-4 w-4 text-primary" />} value={String(data.xp)} />
        <StatCard label="Level" icon={<Trophy className="h-4 w-4 text-amber-500" />} value={String(data.level)} />
      </div>

      {/* Quick session */}
      <QuickSession data={data} />

      {/* Today's goal */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" /> Daily goal
          </p>
          <span className="text-xs text-muted-foreground">
            {Math.round(data.todayMinutes)} / {data.dailyGoal} min
          </span>
        </div>
        <Progress value={goalProgress} className="mt-3 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {goalProgress >= 100 ? (
            "Goal met — great work! 🎉"
          ) : (
            <>
              {Math.max(0, data.dailyGoal - Math.round(data.todayMinutes))} more minutes to hit today&apos;s goal.
            </>
          )}
        </p>
        {data.plan.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Recommended for today
            </p>
            <div className="space-y-1.5">
              {data.plan.slice(0, 3).map((item) => (
                <Link
                  key={item.id}
                  href={lessonHref(item.lesson)}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 transition hover:border-primary/40"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.lesson.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.lesson.courseTitle} · {item.lesson.estimatedMinutes} min
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Continue learning */}
      {data.continueItem && (
        <ContinueLearningCard lesson={data.continueItem} progress={data.continueItem.progress} />
      )}

      {/* Recent networking labs */}
      {recentProjects.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Network className="h-4 w-4 text-primary" /> Your networking labs
            </p>
            <Link href="/networking" className="flex items-center gap-0.5 text-xs font-medium text-primary">
              Open <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {recentProjects.slice(0, 2).map((p) => (
              <Link
                key={p.id}
                href={`/networking${p.missionSlug ? `?mission=${p.missionSlug}` : ""}`}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 transition hover:border-primary/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Code2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.snapshot?.devices?.length ?? 0} devices · {p.snapshot?.cables?.length ?? 0} cables · {timeAgo(p.updatedAt)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent lessons */}
      {lessonActivities.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <ActivityIcon className="h-4 w-4 text-primary" /> Recent lessons
          </p>
          <div className="space-y-1.5">
            {lessonActivities.slice(0, 4).map((a) => (
              <Link
                key={a.id}
                href={a.lesson ? `/learn/${a.course?.slug}/${a.lesson.moduleSlug}/${a.lesson.slug}` : "#"}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 transition hover:border-primary/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.lesson?.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.course?.title} · {timeAgo(a.createdAt)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Level progress */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Award className="h-4 w-4 text-primary" /> Level {data.level} · {data.levelTitle}
          </p>
          <span className="text-xs text-muted-foreground">
            {data.levelCurrent}/{data.levelNeeded}
          </span>
        </div>
        <Progress value={data.levelProgress} className="mt-3 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {Math.max(0, data.levelNeeded - data.levelCurrent)} XP to level {data.level + 1}
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, icon, value }: { label: string; icon: React.ReactNode; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
