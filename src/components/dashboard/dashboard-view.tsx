import Link from "next/link";
import { ArrowRight, Award, BookCheck, BookOpen, Flame, FolderCheck, GraduationCap, ListChecks, Network, PlayCircle, Sparkles, Target } from "lucide-react";
import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/dashboard/plan-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { WhatsNewCard } from "@/components/dashboard/whats-new-card";
import { type DashboardData } from "@/lib/dashboard-data";
import { pathById } from "@/lib/onboarding";
import { FeatureIcon } from "@/components/shared/feature-icon";

// recharts is the largest client dependency on the dashboard; split it into its
// own chunk so it loads only when the study chart is actually rendered.
const StudyChart = dynamic(() => import("@/components/dashboard/study-chart").then((m) => m.StudyChart), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Award; label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
          {sub && <p className="truncate text-[11px] text-muted-foreground/70">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/** "Where do I go next?" — answers the three questions in one card:
 * path, next step, and per-track progress. */
function StartHereCard({ data }: { data: DashboardData }) {
  const path = pathById(data.learningPathId);
  const next = data.nextStep;
  const nextHref = next ? `/learn/${next.courseSlug}/${next.moduleSlug}/${next.lessonSlug}` : "/learn";

  const headline = next
    ? next.kind === "resume"
      ? "Continue where you left off"
      : `Start your ${path?.headline ?? "learning"} path`
    : "Welcome to your coding journey";

  const caption = next
    ? next.kind === "resume"
      ? next.meta
      : next.meta
    : "Pick a track, and we'll always show you exactly what to do next.";

  const mainAction = next
    ? next.kind === "resume"
      ? "Resume lesson"
      : "Start learning"
    : "Explore Learn";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> Your path: {path?.headline ?? "Web Development"}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{headline}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{caption}</p>

          {next && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium leading-snug">{next.lessonTitle}</p>
              <div className="flex items-center gap-3">
                <Progress value={next.progress} className="h-2 flex-1" />
                <span className="text-xs tabular-nums text-muted-foreground">{next.progress}%</span>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button asChild size="sm">
              <Link href={nextHref}>
                {next?.kind === "resume" ? <PlayCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {mainAction} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/learn">
                <BookOpen className="h-4 w-4" /> Browse tracks
              </Link>
            </Button>
          </div>
        </div>

        <div className="w-full shrink-0 space-y-2.5 lg:w-72">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Track progress</p>
          {data.trackProgress.map((t) => (
            <Link
              key={t.track}
              href="/learn"
              className="group flex items-center gap-2.5 rounded-lg border border-border bg-card/70 p-2.5 transition hover:border-primary/40"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${t.color}1a`, color: t.color }}
              >
                <FeatureIcon name={t.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium">{t.label}</p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {t.completed}/{t.total}
                  </p>
                </div>
                <Progress value={t.percent} className="mt-1 h-1.5" />
              </div>
            </Link>
          ))}
          <div className="flex gap-2">
            <Button asChild size="sm" variant="ghost" className="flex-1">
              <Link href="/practice">
                <ListChecks className="h-3.5 w-3.5" /> Practice
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="flex-1">
              <Link href="/networking">
                <Network className="h-3.5 w-3.5" /> Lab
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const firstName = data.userName.split(" ")[0];
  const goalPct = Math.min(100, Math.round((data.todayMinutes / data.dailyGoal) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.levelTitle} · {data.xp.toLocaleString()} XP
            <span className="mx-2 text-muted-foreground/40">•</span>
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" /> {data.streak}-day streak
            </span>
          </p>
        </div>
      </div>

      <StartHereCard data={data} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={BookCheck} value={data.stats.lessons} label="Lessons completed" />
        <StatCard icon={GraduationCap} value={data.stats.courses} label="Courses completed" />
        <StatCard icon={Award} value={data.stats.achievements} label="Achievements earned" />
        <StatCard icon={FolderCheck} value={data.stats.projects} label="Projects approved" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PlanCard plan={data.plan} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Study time — last 14 days</CardTitle>
            </CardHeader>
            <CardContent>
              <StudyChart data={data.chart} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {data.latestRelease && <WhatsNewCard release={data.latestRelease} />}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Level {data.level}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{data.levelTitle}</p>
              <Progress value={Math.round(data.levelProgress * 100)} className="h-2.5" />
              <p className="text-xs text-muted-foreground">
                {data.levelCurrent.toLocaleString()} / {data.levelNeeded.toLocaleString()} XP to level {data.level + 1}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" /> Daily goal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{data.todayMinutes}</span> of {data.dailyGoal} minutes today
              </p>
              <Progress value={goalPct} className="h-2.5" />
              {goalPct >= 100 && <p className="text-xs font-medium text-success">Goal reached — keep it up!</p>}
            </CardContent>
          </Card>

          <ActivityFeed activities={data.activities} />
        </div>
      </div>
    </div>
  );
}
