import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GraduationCap, MousePointerClick, Target, Trophy } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCachedFeaturedCourses, getCachedPlatformStats } from "@/lib/content/course-cache";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/marketing/course-card";
import { Hero } from "@/components/marketing/landing/hero";
import { LabShowcase } from "@/components/marketing/landing/lab-showcase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "by3-3qVIIcJUfwuPYe2YuahGQgsSQEDwkUUh0eHhocE",
  },
};

const WORKFLOW = [
  {
    icon: GraduationCap,
    step: "01",
    title: "Learn a concept",
    text: "Short, structured lessons with clear objectives — written to be read, not watched.",
  },
  {
    icon: MousePointerClick,
    step: "02",
    title: "Practice immediately",
    text: "Auto-graded exercises and knowledge checks in the same page. You know within seconds whether you understood.",
  },
  {
    icon: Target,
    step: "03",
    title: "Apply in the lab",
    text: "Take the concept into the Networking Lab or a project and make it work for real.",
  },
  {
    icon: Trophy,
    step: "04",
    title: "Prove it",
    text: "Complete courses and missions to earn certificates and a measurable record of your skills.",
  },
];

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  // The catalog is enhancement, not essence: if the database is unreachable
  // the page still renders its full narrative without courses/stats.
  const [courses, stats] = await Promise.all([
    getCachedFeaturedCourses().catch(() => []),
    getCachedPlatformStats().catch(() => ({ courses: 0, lessons: 0 })),
  ]);

  return (
    <>
      <Hero courseCount={stats.courses} lessonCount={stats.lessons} />      {/* Core value proposition */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "Built for doing",
              text: "Every lesson ends in something you produce — code that runs, a network that forwards, a project you can show.",
            },
            {
              title: "Real environments",
              text: "A live code editor and a genuine network simulator in the browser. Nothing to install, nothing faked.",
            },
            {
              title: "Progress you can measure",
              text: "Graded exercises, mission verification and certificates — your skill record is based on work you actually completed.",
            },
          ].map((v) => (
            <div key={v.title} className="border-l-2 border-primary/25 pl-5">
              <h2 className="text-sm font-semibold">{v.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Practical learning workflow */}
      <section id="learn" className="scroll-mt-14 border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">How it works</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              One loop: understand, practice, apply, prove
            </h2>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {WORKFLOW.map((s) => (
              <li key={s.step} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="h-4 w-4 text-primary" aria-hidden />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground/70">{s.step}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Networking Laboratory */}
      <LabShowcase />

      {/* Courses */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Courses</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Structured paths, zero fluff</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Each course combines lessons, graded exercises, quizzes and a final project — sequenced
              so every concept is used before it&apos;s assumed.
            </p>
          </div>
          <Button asChild variant="outline" className="hidden shrink-0 sm:inline-flex">
            <Link href="/courses">
              All courses <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.length > 0 ? (
            courses.map((course) => (
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
            ))
          ) : (
            <p className="col-span-full rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              The course catalog is temporarily unavailable. Please check back shortly.
            </p>
          )}
        </div>
        <div className="mt-8 sm:hidden">
          <Button asChild variant="outline" className="w-full">
            <Link href="/courses">View all courses</Link>
          </Button>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Start with your first lesson today</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Create a free account, pick a course, and build something real in your first session.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/register">Create free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/courses">Explore the catalog</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
