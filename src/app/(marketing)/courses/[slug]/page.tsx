import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  CircleDashed,
  Clock,
  FileCode2,
  GraduationCap,
  Layers,
  Lock,
  Play,
  Star,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { makePerf } from "@/lib/perf";
import { CourseCard } from "@/components/marketing/course-card";
import { EnrollButton } from "@/components/marketing/enroll-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DIFFICULTY_LABELS, LESSON_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function loadSuggested(excludeId: string) {
  return prisma.course.findMany({
    where: { id: { not: excludeId }, status: "PUBLISHED" },
    include: { category: true, _count: { select: { modules: true, lessons: true, enrollments: true } } },
    orderBy: { enrollments: { _count: "desc" } },
    take: 3,
  });
}

export default async function CourseDetailPage({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const perf = makePerf(`courses/${slug}`);
  const session = await getSession();

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      category: true,
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            include: { _count: { select: { exercises: true, quizzes: true } } },
          },
        },
      },
    },
  });
  perf("course findUnique");
  if (!course || course.status !== "PUBLISHED") notFound();

  // Everything below depends only on course.id (+ session), so it runs in ONE
  // parallel batch — a single pooled round trip instead of four sequential ones
  // (the dominant latency cost: each round trip is ~260ms on this pooler stack).
  // Secondary statistics are read-only counts with no consistency requirement, so
  // they run as independent pooled queries (NOT a $transaction, which pins a pooled
  // connection for the whole batch and can exhaust the pool under concurrency).
  // If they fail the course page still renders; stats degrade gracefully.
  const [enrollment, completedRows, certificate, prereqs, stats, suggested] = await Promise.all([
    session ? prisma.enrollment.findUnique({ where: { userId_courseId: { userId: session.id, courseId: course.id } } }) : null,
    session
      ? prisma.lessonProgress.findMany({
          where: { userId: session.id, lesson: { courseId: course.id }, status: LESSON_STATUS.COMPLETED },
          select: { lessonId: true },
        })
      : [],
    session ? prisma.certificate.findUnique({ where: { userId_courseId: { userId: session.id, courseId: course.id } } }) : null,
    (course.prerequisiteIds as string[] | null)?.length
      ? prisma.course.findMany({ where: { slug: { in: course.prerequisiteIds as string[] }, status: "PUBLISHED" }, select: { id: true, title: true, slug: true } })
      : Promise.resolve([]),
    (async (): Promise<[number, number, number, number] | null> => {
      try {
        return (await Promise.all([
          prisma.enrollment.count({ where: { courseId: course.id } }),
          prisma.project.count({ where: { courseId: course.id, isPublished: true } }),
          prisma.exercise.count({ where: { lesson: { courseId: course.id } } }),
          prisma.quiz.count({ where: { courseId: course.id } }),
        ])) as [number, number, number, number];
      } catch (err) {
        console.error(`[courses/${slug}] statistics query failed:`, err);
        return null;
      }
    })(),
    (async (): Promise<Awaited<ReturnType<typeof loadSuggested>>> => {
      try {
        return await loadSuggested(course.id);
      } catch (err) {
        console.error(`[courses/${slug}] suggested courses query failed:`, err);
        return [];
      }
    })(),
  ]);
  perf("parallel batch (enrollment/progress/cert/prereqs/stats/suggested)");

  const flatLessons = course.modules.flatMap((m) => m.lessons);
  const lessonCount = flatLessons.length;

  const [learnerCount = 0, projectCount = 0, exerciseCount = 0, quizCount = 0] = stats ?? [];

  const completed = new Set(completedRows.map((r) => r.lessonId));
  const completedCount = flatLessons.filter((l) => completed.has(l.id)).length;
  const progress = lessonCount === 0 ? 0 : Math.round((completedCount / lessonCount) * 100);
  const isComplete = progress >= 100;

  let currentLesson: (typeof flatLessons)[number] | undefined;
  for (const lesson of flatLessons) {
    if (!completed.has(lesson.id)) {
      currentLesson = lesson;
      break;
    }
  }
  const currentModule = currentLesson ? course.modules.find((m) => m.lessons.some((l) => l.id === currentLesson!.id)) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero */}
      <section className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              {course.category?.name ?? "Course"}
            </Badge>
            <Badge variant="secondary">{DIFFICULTY_LABELS[course.difficulty as keyof typeof DIFFICULTY_LABELS] ?? course.difficulty}</Badge>
            {course.isFree && <Badge variant="success">Free</Badge>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{course.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{course.longDescription ?? course.description}</p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {course.estimatedHours} hours</span>
            <span className="inline-flex items-center gap-1.5"><Layers className="h-4 w-4" /> {course.modules.length} modules</span>
            <span className="inline-flex items-center gap-1.5"><FileCode2 className="h-4 w-4" /> {lessonCount} lessons</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {stats ? `${learnerCount} learners` : "Learner stats unavailable"}</span>
          </div>

          {prereqs.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> Prerequisites:</span>
              {prereqs.map((p) => (
                <Link key={p.id} href={`/courses/${p.slug}`}>
                  <Badge variant="outline" className="hover:opacity-80">{p.title}</Badge>
                </Link>
              ))}
            </div>
          )}

          {session && (
            <div className="mt-8 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium">{isComplete ? "Course completed" : "Your progress"}</span>
                <span className="text-muted-foreground">{completedCount}/{lessonCount} lessons</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        {/* CTA sidebar */}
        <aside className="lg:pt-2">
          <Card className="overflow-hidden">
            <div className="flex h-24 items-center justify-center text-5xl" style={{ background: `${course.color}22` }}>
              <span>{course.icon ?? "📘"}</span>
            </div>
            <CardContent className="p-5">
              {stats ? (
                <dl className="mb-4 grid grid-cols-2 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Exercises</dt>
                    <dd className="font-medium">{exerciseCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Quizzes</dt>
                    <dd className="font-medium">{quizCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Projects</dt>
                    <dd className="font-medium">{projectCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">XP total</dt>
                    <dd className="font-medium">{course.xpTotal}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                  Statistics temporarily unavailable. Reload to try again.
                </p>
              )}

              {!session ? (
                <div className="space-y-2">
                  <Button asChild className="w-full" size="lg">
                    <Link href="/register">Sign up free to enroll</Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline">Sign in</Link>
                  </p>
                </div>
              ) : isComplete ? (
                <div className="space-y-2">
                  <Badge variant="success" className="w-full justify-center py-2">
                    <CheckCircle2 className="h-4 w-4" /> Completed
                  </Badge>
                  {certificate ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/certificates/${certificate.id}`}><Award className="h-4 w-4" /> View certificate</Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/certificates/${course.slug}`}><Award className="h-4 w-4" /> View certificate</Link>
                    </Button>
                  )}
                  <Button asChild variant="ghost" className="w-full">
                    <Link href={`/learn/${course.slug}/${currentModule?.slug ?? course.modules[0]?.slug}/${flatLessons[0]?.slug}`}>Review course</Link>
                  </Button>
                </div>
              ) : enrollment ? (
                <div className="space-y-2">
                  <Button asChild className="w-full" size="lg">
                    <Link href={currentLesson && currentModule ? `/learn/${course.slug}/${currentModule.slug}/${currentLesson.slug}` : "#"}>
                      Continue learning <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">{enrollment.status === "COMPLETED" ? "Enrolled · completed" : "Enrolled"}</p>
                </div>
              ) : (
                <EnrollButton slug={course.slug} label={course.isFree ? "Enroll free" : "Enroll in course"} />
              )}
            </CardContent>
          </Card>
        </aside>
      </section>

      {/* Syllabus */}
      <section className="mt-14">
        <h2 className="mb-1 text-2xl font-bold">Course content</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {lessonCount} lessons across {course.modules.length} modules.
        </p>
        <div className="space-y-4">
          {course.modules.map((mod, mi) => {
            const doneInModule = mod.lessons.filter((l) => completed.has(l.id)).length;
            return (
              <Card key={mod.id}>
                <CardContent className="p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-muted-foreground">
                        {mi + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold">{mod.title}</h3>
                        {mod.description && <p className="text-xs text-muted-foreground">{mod.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {mod.estimatedMinutes} min</span>
                      <span>{doneInModule}/{mod.lessons.length} done</span>
                    </div>
                  </div>
                  <ol className="divide-y divide-border rounded-md border border-border">
                    {mod.lessons.map((lesson) => {
                      const done = completed.has(lesson.id);
                      const isCurrent = currentLesson?.id === lesson.id;
                      return (
                        <li key={lesson.id}>
                          <Link
                            href={`/learn/${course.slug}/${mod.slug}/${lesson.slug}`}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-secondary/60 ${done ? "text-muted-foreground" : ""}`}
                          >
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                            ) : isCurrent ? (
                              <Play className="h-4 w-4 shrink-0 text-primary" />
                            ) : (
                              <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="flex-1">{lesson.title}</span>
                            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex">
                              {lesson._count.exercises > 0 && (
                                <span className="inline-flex items-center gap-1"><FileCode2 className="h-3 w-3" /> {lesson._count.exercises}</span>
                              )}
                              {lesson._count.quizzes > 0 && (
                                <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {lesson._count.quizzes}</span>
                              )}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Suggested */}
      {suggested.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">Keep learning</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suggested.map((s) => (
              <CourseCard
                key={s.id}
                course={{
                  id: s.id,
                  title: s.title,
                  slug: s.slug,
                  description: s.description,
                  color: s.color,
                  icon: s.icon,
                  difficulty: s.difficulty,
                  estimatedHours: s.estimatedHours,
                  category: s.category,
                  counts: {
                    modules: s._count.modules,
                    lessons: s._count.lessons,
                    enrollments: s._count.enrollments,
                  },
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
