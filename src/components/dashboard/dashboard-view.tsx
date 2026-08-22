import Link from "next/link";
import { ArrowRight, Award, BookCheck, BookOpen, Flame, FolderCheck, GraduationCap, Network, PlayCircle, Sparkles, Target } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { PlanCard } from "@/components/dashboard/plan-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { WhatsNewCard } from "@/components/dashboard/whats-new-card";
import { QuickSession } from "@/components/dashboard/quick-session";
import { StudyChart } from "@/components/dashboard/study-chart";
import { type DashboardData } from "@/lib/dashboard-data";
import { pathById } from "@/lib/onboarding";
import { FeatureIcon } from "@/components/shared/feature-icon";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** "Where do I go next?" — path, next step, and per-track progress in one panel. */
function StartHereCard({ data }: { data: DashboardData }) {
  const path = pathById(data.learningPathId);
  const next = data.nextStep;
  const nextHref = next ? `/learn/${next.courseSlug}/${next.moduleSlug}/${next.lessonSlug}` : "/learn";

  const headline = next
    ? next.kind === "resume"
      ? "Continue where you left off"
      : `Start your ${path?.headline ?? "learning"} path`
    : "Welcome to your coding journey";

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" aria-hidden /> Your path: {path?.headline ?? "Web Development"}
          </p>
          <h2 className="mt-3 text-lg font-semibold tracking-tight sm:text-xl">{headline}</h2>
          {next && (
            <>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{next.meta}</p>
              <p className="mt-3 text-sm font-medium leading-snug">{next.lessonTitle}</p>
              <div className="mt-2 flex max-w-sm items-center gap-3">
                <Progress value={next.progress} className="flex-1" />
                <span className="text-xs tabular-nums text-muted-foreground">{next.progress}%</span>
              </div>
            </>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button asChild size="sm">
              <Link href={nextHref}>
                {next?.kind === "resume" ? <PlayCircle /> : <Sparkles />}
                {next ? (next.kind === "resume" ? "Resume lesson" : "Start learning") : "Explore Learn"}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/learn">
                <BookOpen /> Browse tracks
              </Link>
            </Button>
          </div>
        </div>

        <div className="w-full shrink-0 space-y-2 lg:w-64">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Track progress</p>
          {data.trackProgress.map((t) => (
            <Link
              key={t.track}
              href="/learn"
              className="group flex items-center gap-2.5 rounded-lg border border-border p-2.5 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <p className="text-2xs tabular-nums text-muted-foreground">
                    {t.completed}/{t.total}
                  </p>
                </div>
                <Progress value={t.percent} className="mt-1 h-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Recent Networking Lab projects with counts computed server-side. */
function LabProjects({
  projects,
}: {
  projects: { id: string; title: string; missionSlug: string | null; updatedAt: Date; deviceCount: number }[];
}) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Networking Lab</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Build and simulate real networks in the browser-based lab.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href="/networking">
              <Network /> Open the lab
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Your lab projects</CardTitle>
        <Link href="/networking" className="text-xs font-medium text-muted-foreground transition hover:text-primary">
          Open lab
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/networking?project=${p.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.missionSlug ?? "Sandbox"} · {p.deviceCount} device{p.deviceCount === 1 ? "" : "s"}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function DashboardView({
  data,
  recentProjects,
}: {
  data: DashboardData;
  recentProjects: { id: string; title: string; missionSlug: string | null; updatedAt: Date; deviceCount: number }[];
}) {
  const firstName = data.userName.split(" ")[0];
  const goalPct = Math.min(100, Math.round((data.todayMinutes / data.dailyGoal) * 100));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {/* Header */}
      <PageGreeting firstName={firstName} level={data.level} xp={data.xp} streak={data.streak} />

      {/* Primary action */}
      <StartHereCard data={data} />

      {/* Quick session — small-window learning loop */}
      <div className="lg:hidden">
        <QuickSession data={data} />
      </div>

      {/* Purposeful stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={BookCheck} label="Lessons completed" value={data.stats.lessons} hint={data.stats.lessons === 0 ? "Finish your first lesson" : undefined} />
        <Stat icon={GraduationCap} label="Courses completed" value={data.stats.courses} tone="success" />
        <Stat icon={FolderCheck} label="Projects approved" value={data.stats.projects} tone="primary" />
        <Stat icon={Award} label="Achievements earned" value={data.stats.achievements} />
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <PlanCard plan={data.plan} />

          <Card>
            <CardHeader>
              <CardTitle>Study time — last 14 days</CardTitle>
            </CardHeader>
            <CardContent>
              <StudyChart data={data.chart} />
            </CardContent>
          </Card>

          <div className="lg:hidden">
            <ActivityFeed activities={data.activities} />
          </div>
        </div>

        <div className="space-y-5">
          {data.latestRelease && <WhatsNewCard release={data.latestRelease} />}

          <LabProjects projects={recentProjects} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" aria-hidden /> Daily goal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">{data.todayMinutes}</span> of{" "}
                {data.dailyGoal} minutes today
              </p>
              <Progress value={goalPct} aria-label={`Daily goal ${goalPct}%`} />
              {goalPct >= 100 && <p className="text-xs font-medium text-success">Goal reached — nice work.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Level {data.level}</CardTitle>
              <Flame className="h-4 w-4 text-warning" aria-hidden />
            </CardHeader>
            <CardContent className="space-y-2.5">
              <p className="text-sm text-muted-foreground">{data.levelTitle}</p>
              <Progress
                value={Math.round(data.levelProgress * 100)}
                aria-label={`Level progress ${Math.round(data.levelProgress * 100)}%`}
              />
              <p className="text-xs text-muted-foreground">
                {data.levelCurrent.toLocaleString()} / {data.levelNeeded.toLocaleString()} XP to level{" "}
                {data.level + 1}
              </p>
            </CardContent>
          </Card>

          <div className="hidden lg:block">
            <ActivityFeed activities={data.activities} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PageGreeting({ firstName, level, xp, streak }: { firstName: string; level: number; xp: number; streak: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Level {level} · {xp.toLocaleString()} XP
          <span className="mx-2 text-muted-foreground/40" aria-hidden>
            ·
          </span>
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-warning" aria-hidden /> {streak}-day streak
          </span>
        </p>
      </div>
      <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
        <Link href="/networking">
          <Network /> Open Networking Lab
        </Link>
      </Button>
    </div>
  );
}
