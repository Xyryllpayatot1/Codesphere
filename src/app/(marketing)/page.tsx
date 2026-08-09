import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Play, Code2, CheckCircle2, BarChart3, Sparkles, Rocket, Flame, Trophy } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCachedFeaturedCourses } from "@/lib/content/course-cache";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseCard } from "@/components/marketing/course-card";
import { BRAND_TAGLINE, CREATOR_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "by3-3qVIIcJUfwuPYe2YuahGQgsSQEDwkUUh0eHhocE",
  },
};

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const courses = await getCachedFeaturedCourses();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 text-center">
          <Badge variant="accent" className="mb-6">
            <Sparkles className="h-3.5 w-3.5" /> {BRAND_TAGLINE}
          </Badge>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Learn to code by <span className="text-primary">actually coding</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Hands-on lessons, a live code playground, real exercises and projects — plus a smart
            study plan that adapts to your schedule. No video-only lectures, no AI gimmicks.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Start learning free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/courses">
                <Play className="h-4 w-4" /> Browse courses
              </Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> No credit card</span>
            <span className="inline-flex items-center gap-1.5"><Code2 className="h-4 w-4 text-success" /> Real projects in your portfolio</span>
            <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-success" /> Progress & analytics</span>
            <span className="inline-flex items-center gap-1.5"><Flame className="h-4 w-4 text-success" /> Streaks & achievements</span>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            A student-driven platform for practical technology education · Created &amp; led by {CREATOR_NAME}
          </p>
        </div>
      </section>

      {/* Courses */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Explore the catalog</h2>
            <p className="mt-2 text-muted-foreground">Structured paths from zero to project-ready.</p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/courses">All courses <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={{
                id: course.id,
                title: course.title,
                slug: course.slug,
                description: course.description,
                color: course.color,
                icon: course.icon,
                difficulty: course.difficulty,
                estimatedHours: course.estimatedHours,
                category: course.category,
                counts: {
                  modules: course._count.modules,
                  lessons: course._count.lessons,
                  enrollments: course._count.enrollments,
                },
              }}
            />
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Everything you need to go from zero to builder</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Code2, title: "Live code playground", text: "Write and run real HTML, CSS and JavaScript right inside every lesson — with instant feedback." },
              { icon: CheckCircle2, title: "Auto-graded exercises", text: "Structure checks, test cases and output comparisons grade your work instantly, with precise hints." },
              { icon: Trophy, title: "Quizzes & checkpoints", text: "Multiple choice, code completion, ordering and more — prove you understand before moving on." },
              { icon: Rocket, title: "Real projects", text: "Portfolio, calculator, todo app, weather app and more. Submit work and earn certificates." },
              { icon: BarChart3, title: "Smart study plan", text: "A deterministic algorithm builds a daily plan from your progress, mistakes and available time." },
              { icon: Flame, title: "Gamified progress", text: "XP, levels, streaks, badges and certificates keep you motivated, lesson after lesson." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">How it works</h2>
        <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-3">
          {[
            { step: "01", title: "Pick a path", text: "Choose a course that fits your goal — HTML, CSS, JavaScript, and more are on the way." },
            { step: "02", title: "Learn by doing", text: "Read a concept, run examples, solve exercises and pass quizzes — all in one flow." },
            { step: "03", title: "Build and certify", text: "Unlock projects, submit your work, earn achievements and a certificate per course." },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <span className="text-sm font-bold text-primary">{s.step}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/15 to-accent/20 p-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Your first lesson is minutes away</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Join thousands of learners building real skills with interactive programming education.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">Create free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/courses">Browse courses</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
