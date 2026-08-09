import Link from "next/link";
import { ArrowRight, Award, BookCheck, Flame, FolderCheck, GraduationCap, Target } from "lucide-react";
import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/dashboard/plan-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { type DashboardData } from "@/lib/dashboard-data";

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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Continue learning</CardTitle>
            </CardHeader>
            <CardContent>
              {data.continueItem ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{data.continueItem.courseTitle}</p>
                  <p className="text-sm font-medium leading-snug">{data.continueItem.title}</p>
                  <Progress value={data.continueItem.progress} className="h-2" />
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/learn/${data.continueItem.courseSlug}/${data.continueItem.moduleSlug}/${data.continueItem.slug}`}>
                      Resume lesson <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">You haven’t started a lesson yet.</p>
                  <Button asChild size="sm" className="w-full">
                    <Link href="/courses">Pick a course</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <ActivityFeed activities={data.activities} />
        </div>
      </div>
    </div>
  );
}
