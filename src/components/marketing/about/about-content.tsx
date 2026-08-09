// ---------------------------------------------------------------------------
// CodeSphere
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CodeSphere
// ---------------------------------------------------------------------------

import Link from "next/link";
import { ArrowRight, Boxes, Eye, Flag, HelpCircle, HeartHandshake, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BRAND_DESCRIPTION,
  BRAND_MISSION,
  BRAND_NAME,
  BRAND_VISION,
  CREATOR_NAME,
  CREATOR_ROLE,
  CREATOR_SHORT_DESC,
  CREATOR_TITLES,
} from "@/lib/brand";

export function AboutContent() {
  return (
    <div className="space-y-16 py-16 sm:space-y-24 sm:py-20">
      {/* Identity */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">About CodeSphere</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            {BRAND_NAME}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            {BRAND_DESCRIPTION}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Start learning free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/courses">Browse courses</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-full rounded-2xl border border-border bg-card p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Flag className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Our mission</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{BRAND_MISSION}</p>
          </div>
          <div className="h-full rounded-2xl border border-border bg-card p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Eye className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Our vision</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{BRAND_VISION}</p>
          </div>
        </div>
      </section>

      {/* Problem & Approach */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-full rounded-2xl border border-border bg-card p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <HelpCircle className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Why CodeSphere exists</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Too much technical education stays passive — video-only lectures, static reading and theory that
              rarely becomes skill. Many students finish courses knowing facts about code but without the
              confidence to write, run, and fix real software or configure real networks.
            </p>
          </div>
          <div className="h-full rounded-2xl border border-border bg-card p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
              <Route className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Our approach</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Every learner gets a live playground, hands-on exercises, quizzes and real projects instead of
              watching from the sidelines. Structured courses, gamified progress and virtual networking
              laboratories make learning hands-on — students experiment safely and build skills they can
              actually use.
            </p>
          </div>
        </div>
      </section>

      {/* Creator & Project Lead */}
      <section className="mx-auto max-w-4xl px-4">
        <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-bold text-accent-foreground">
            J
          </span>
          <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-primary">Created &amp; led by</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">{CREATOR_NAME}</h2>
          <p className="mt-1 font-medium text-muted-foreground">{CREATOR_ROLE}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {CREATOR_TITLES.join(" · ")}
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {CREATOR_SHORT_DESC}
          </p>
        </div>
      </section>

      {/* Technology & Credits */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-full rounded-2xl border border-border bg-card p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Boxes className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Technology</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Built on modern, open tools: Next.js, React and TypeScript for the platform, a real
              sandboxed code engine for lessons, and a full virtual networking simulation for hands-on labs.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/credits">Full technology &amp; credits list</Link>
            </Button>
          </div>
          <div className="h-full rounded-2xl border border-border bg-card p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Credits</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              CodeSphere is a student-driven educational technology project. Full product, creator and
              technology credits, including our AI-assisted development disclosure, live on the Credits page.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/credits">View credits <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center sm:p-14">
          <div className="pointer-events-none absolute -bottom-32 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Start building practical skills today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {CREATOR_SHORT_DESC}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Create your free account <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/courses">Browse courses</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
