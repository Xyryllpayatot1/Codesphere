"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Network, Timer, Zap } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/lib/dashboard-data";

type Duration = 3 | 5 | 10;

const DURATIONS: { value: Duration; label: string }[] = [
  { value: 3, label: "3 min" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
];

function lessonHref(lesson: { courseSlug: string; moduleSlug: string; slug: string }): string {
  return `/learn/${lesson.courseSlug}/${lesson.moduleSlug}/${lesson.slug}`;
}

/** "You have N minutes" — recommends one lesson, one practice, one mini challenge. */
export function QuickSession({ data }: { data: DashboardData }) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<Duration>(5);

  const lesson = data.continueItem;
  const planLesson = data.plan[0]?.lesson ?? null;

  return (
    <>
      <div
        className="relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-900 p-5 text-white shadow-lg shadow-violet-900/30 active:scale-[0.99]"
        onClick={() => setOpen(true)}
        role="button"
        aria-label="Start a quick session"
      >
        <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10 blur-xl" aria-hidden />
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Timer className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Quick Session</p>
            <p className="text-xs text-violet-200">You have a few minutes? Let&apos;s learn.</p>
          </div>
          <ArrowRight className="ml-auto h-5 w-5 text-violet-200" />
        </div>
        <div className="mt-3 flex gap-1.5">
          {DURATIONS.map((d) => (
            <span
              key={d.value}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                duration === d.value ? "bg-white text-violet-700" : "bg-white/15 text-violet-100"
              )}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>

      <BottomSheet open={open} onOpenChange={setOpen} title="Quick Session" description="Pick how long you can spare — we'll build your plan.">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition",
                  duration === d.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary"
                )}
              >
                <Timer className="h-4 w-4" /> {d.label}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            <SessionCard
              icon={<BookOpen className="h-4 w-4" />}
              tag="1 · Lesson"
              title={lesson?.title ?? (planLesson?.title ?? "Start your first lesson")}
              sub={lesson?.courseTitle ?? planLesson?.courseTitle}
              href={lesson ? lessonHref(lesson) : "/learn"}
              cta="Start lesson"
            />
            <SessionCard
              icon={<Code2 className="h-4 w-4" />}
              tag="2 · Practice"
              title="Code in the playground"
              sub="Free-form HTML, CSS and JS"
              href="/playground"
              cta="Open playground"
            />
            <SessionCard
              icon={<Network className="h-4 w-4" />}
              tag="3 · Mini challenge"
              title="Networking mini mission"
              sub="Build a LAN and ping across it"
              href="/networking?mission=lan-basics"
              cta="Start mission"
            />
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Short sessions build streaks too — every minute counts.
          </p>
        </div>
      </BottomSheet>
    </>
  );
}

function SessionCard({
  icon,
  tag,
  title,
  sub,
  href,
  cta,
}: {
  icon: React.ReactNode;
  tag: string;
  title: string;
  sub?: string | null;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{tag}</p>
        <p className="truncate text-sm font-medium">{title}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

/** Compact in-dashboard resume card reused by the mobile home. */
export function ContinueLearningCard({ lesson, progress }: { lesson: NonNullable<DashboardData["continueItem"]>; progress: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Continue learning</p>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-1.5 line-clamp-1 text-base font-semibold">{lesson.title}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">{lesson.courseTitle}</p>
      <Progress value={progress} className="mt-3 h-1.5" />
      <Button asChild size="sm" className="mt-3 w-full">
        <Link href={lessonHref(lesson)}>Resume</Link>
      </Button>
    </div>
  );
}
