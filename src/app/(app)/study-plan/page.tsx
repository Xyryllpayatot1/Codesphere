import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStudyPlan } from "@/lib/engine/recommendation";
import { todayKey, fromDateKey, toDateKey } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanItemToggle } from "@/components/dashboard/plan-item-toggle";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayLabel(date: Date): string {
  const key = toDateKey(date);
  if (key === todayKey()) return "Today";
  const diff = Math.round((date.getTime() - fromDateKey(todayKey()).getTime()) / 86400000);
  if (diff === 1) return "Tomorrow";
  return WEEKDAYS[date.getDay()];
}

type PlanItemRow = {
  id: string;
  date: Date;
  status: string;
  reason: string;
  lesson: {
    title: string;
    slug: string;
    estimatedMinutes: number;
    moduleSlug: string;
    courseSlug: string;
    courseTitle: string;
    color: string;
  };
};

export default async function StudyPlanPage() {
  const session = await requireSession();
  const userId = session.id;
  const today = todayKey();

  const [settings, enrollments, items] = await Promise.all([
    prisma.userSetting.findUnique({ where: { userId } }),
    prisma.enrollment.findMany({
      where: { userId, status: { not: "COMPLETED" }, course: { status: "PUBLISHED" } },
      select: { id: true },
    }),
    prisma.studyPlanItem.findMany({
      where: { userId, date: { gte: fromDateKey(today), lt: fromDateKey(todayKey(7)) } },
      orderBy: [{ date: "asc" }, { priority: "asc" }],
      select: { id: true, date: true, status: true, reason: true, lessonId: true },
    }),
  ]);

  const todayCount = items.filter((i) => toDateKey(i.date) === today).length;

  let planItems = items;
  if (todayCount === 0 && enrollments.length > 0) {
    await generateStudyPlan(userId, { availableMinutes: settings?.dailyGoalMinutes ?? 30, dateKey: today });
    planItems = await prisma.studyPlanItem.findMany({
      where: { userId, date: { gte: fromDateKey(today), lt: fromDateKey(todayKey(7)) } },
      orderBy: [{ date: "asc" }, { priority: "asc" }],
      select: { id: true, date: true, status: true, reason: true, lessonId: true },
    });
  }

  const lessonIds = [...new Set(planItems.map((i) => i.lessonId))];
  const lessons =
    lessonIds.length > 0
      ? await prisma.lesson.findMany({
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
      : [];
  const lessonById = new Map(lessons.map((l) => [l.id, l]));

  const plan: PlanItemRow[] = planItems.flatMap((item) => {
    const lesson = lessonById.get(item.lessonId);
    if (!lesson) return [];
    return [
      {
        id: item.id,
        date: item.date,
        status: item.status,
        reason: item.reason,
        lesson: {
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

  const groups = new Map<string, PlanItemRow[]>();
  for (const item of plan) {
    const key = toDateKey(item.date);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const doneCount = plan.filter((i) => i.status === "DONE").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CalendarClock className="h-6 w-6 text-primary" /> Study plan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Built from your progress, mistakes and {settings?.dailyGoalMinutes ?? 30} minutes of daily goal.
            {doneCount > 0 && ` ${doneCount} lesson${doneCount === 1 ? "" : "s"} done.`}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/profile?tab=settings">Adjust my schedule</Link>
        </Button>
      </div>

      {plan.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {enrollments.length === 0
                ? "Enroll in a course and a personalized daily plan will appear here."
                : "No lessons scheduled for the next 7 days — you're all caught up."}
            </p>
            {enrollments.length === 0 && (
              <Button asChild size="sm" className="mt-4">
                <Link href="/courses">Browse courses</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...groups.keys()].map((key) => {
            const list = groups.get(key)!;
            const isToday = key === today;
            return (
              <Card key={key} className={isToday ? "border-primary/40" : undefined}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {dayLabel(list[0].date)}
                    {isToday && <Badge variant="accent">Today</Badge>}
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {list.reduce((sum, i) => sum + i.lesson.estimatedMinutes, 0)} min
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {list.map((item) => (
                      <li
                        key={item.id}
                        className={`flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-muted/50 ${
                          item.status === "DONE" ? "opacity-60" : ""
                        }`}
                      >
                        <PlanItemToggle id={item.id} done={item.status === "DONE"} />
                        <span
                          className="h-8 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: item.lesson.color }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/learn/${item.lesson.courseSlug}/${item.lesson.moduleSlug}/${item.lesson.slug}`}
                            className={`block truncate text-sm font-medium hover:text-primary ${
                              item.status === "DONE" ? "line-through" : ""
                            }`}
                          >
                            {item.lesson.title}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.reason} · {item.lesson.estimatedMinutes} min · {item.lesson.courseTitle}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
