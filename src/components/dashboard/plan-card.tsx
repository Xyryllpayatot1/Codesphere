import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanItemToggle } from "@/components/dashboard/plan-item-toggle";
import { type DashboardData } from "@/lib/dashboard-data";
import { todayKey, toDateKey, fromDateKey, cn } from "@/lib/utils";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayLabel(date: Date): string {
  const key = toDateKey(date);
  if (key === todayKey()) return "Today";
  const diff = Math.round((date.getTime() - fromDateKey(todayKey()).getTime()) / 86400000);
  if (diff === 1) return "Tomorrow";
  return WEEKDAYS[date.getDay()];
}

function lessonHref(lesson: DashboardData["plan"][number]["lesson"]) {
  return `/learn/${lesson.courseSlug}/${lesson.moduleSlug}/${lesson.slug}`;
}

export function PlanCard({ plan }: { plan: DashboardData["plan"] }) {
  const groups = new Map<string, DashboardData["plan"]>();
  for (const item of plan) {
    const key = toDateKey(item.date);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const keys = [...groups.keys()];

  if (keys.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your study plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enroll in a course to get a personalized daily plan built around your schedule.
          </p>
          <Link href="/courses" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Browse courses <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { done, pending } = keys
    .slice(0, 5)
    .reduce<{ done: number; pending: number }>(
      (acc, key) => {
        for (const item of groups.get(key)!) {
          if (item.status === "DONE") acc.done += 1;
          else acc.pending += 1;
        }
        return acc;
      },
      { done: 0, pending: 0 }
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your study plan</CardTitle>
        <p className="text-xs text-muted-foreground">
          {pending === 0 && done > 0 ? "All caught up. Nice work!" : `${pending} lesson${pending === 1 ? "" : "s"} scheduled · ${done} done`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {keys.slice(0, 5).map((key) => (
          <div key={key}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dayLabel(groups.get(key)![0].date)}
            </p>
            <ul className="space-y-1">
              {groups.get(key)!.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-muted/50",
                    item.status === "DONE" && "opacity-60"
                  )}
                >
                  <PlanItemToggle id={item.id} done={item.status === "DONE"} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={lessonHref(item.lesson)}
                      className={cn("block truncate text-sm font-medium hover:text-primary", item.status === "DONE" && "line-through")}
                    >
                      {item.lesson.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.reason} · {item.lesson.estimatedMinutes} min
                    </p>
                  </div>
                  <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
                    {item.lesson.courseTitle}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
