"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Network, Timer, Zap } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
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

/** "You have N minutes" — recommends one lesson, one practice. */
export function QuickSession({ data }: { data: DashboardData }) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<Duration>(5);

  const lesson = data.continueItem;
  const planLesson = data.plan[0]?.lesson ?? null;

  return (
    <>
      <button
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Timer className="h-5 w-5 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Quick session</span>
          <span className="block text-xs text-muted-foreground">
            Short on time? Get a {duration}-minute plan.
          </span>
        </span>
        <span className="flex gap-1" aria-hidden>
          {DURATIONS.map((d) => (
            <span
              key={d.value}
              className={cn(
                "rounded-full px-1.5 py-0.5 text-2xs font-medium",
                duration === d.value ? "bg-primary/12 text-primary" : "bg-secondary text-muted-foreground"
              )}
            >
              {d.value}m
            </span>
          ))}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <BottomSheet open={open} onOpenChange={setOpen} title="Quick session" description="Pick how long you can spare — we'll build your plan.">
        <div className="space-y-4">
          <div className="flex items-center gap-2" role="group" aria-label="Session duration">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                aria-pressed={duration === d.value}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
              icon={<Network className="h-4 w-4" />}
              tag="2 · Lab"
              title="Networking mini mission"
              sub="Build a LAN and ping across it"
              href="/networking?mission=lan-basics"
              cta="Start mission"
            />
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" aria-hidden />
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
        <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{tag}</p>
        <p className="truncate text-sm font-medium">{title}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
