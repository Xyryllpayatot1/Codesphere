import Link from "next/link";
import { ArrowRight, BookOpen, Flame } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseCard } from "@/components/marketing/course-card";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const session = await requireSession();

  const [courses, enrollments, lessonProgress, continueLesson] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        category: true,
        _count: { select: { modules: true, lessons: true, enrollments: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.enrollment.findMany({ where: { userId: session.id }, select: { courseId: true, status: true } }),
    prisma.lessonProgress.findMany({
      where: { userId: session.id },
      select: { lessonId: true, status: true, lesson: { select: { courseId: true } } },
    }),
    prisma.lessonProgress.findFirst({
      where: { userId: session.id, status: { not: "COMPLETED" } },
      orderBy: { lastAccessedAt: "desc" },
      select: {
        lesson: {
          select: {
            id: true,
            title: true,
            slug: true,
            course: { select: { slug: true, title: true, color: true } },
            module: { select: { slug: true } },
          },
        },
      },
    }),
  ]);

  const enrolled = new Set(enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.courseId));
  const completedLessons = new Set(lessonProgress.filter((l) => l.status === "COMPLETED").map((l) => l.lessonId));
  const lessonsByCourse = new Map<string, number>();
  const doneByCourse = new Map<string, number>();
  for (const c of courses) {
    lessonsByCourse.set(c.id, c._count.lessons);
    doneByCourse.set(c.id, 0);
  }
  for (const l of lessonProgress) {
    if (lessonsByCourse.has(l.lesson.courseId)) doneByCourse.set(l.lesson.courseId, (doneByCourse.get(l.lesson.courseId) ?? 0) + 1);
  }
  void completedLessons;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off, or start a new path.</p>
        </div>
      </div>

      {continueLesson?.lesson.course && (
        <Card className="overflow-hidden">
          <div className="h-1.5" style={{ background: continueLesson.lesson.course.color }} />
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Continue learning · {continueLesson.lesson.course.title}</p>
              <p className="mt-1 truncate text-lg font-semibold">{continueLesson.lesson.title}</p>
            </div>
            <Button asChild size="sm" className="shrink-0 self-start sm:self-auto">
              <Link
                href={`/learn/${continueLesson.lesson.course.slug}/${continueLesson.lesson.module.slug}/${continueLesson.lesson.slug}`}
              >
                Resume lesson <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            <p className="font-medium">No courses published yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">Check back soon — new paths are on the way.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              {enrolled.size > 0 ? (
                <>
                  <Flame className="h-4 w-4 text-primary" /> In progress
                </>
              ) : (
                "All courses"
              )}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const total = lessonsByCourse.get(course.id) ?? 0;
                const done = doneByCourse.get(course.id) ?? 0;
                const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={course.id} className="relative">
                    <CourseCard
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
                    {enrolled.has(course.id) && progress > 0 && (
                      <div className="absolute inset-x-5 bottom-4">
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {enrolled.size === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Open a course to start learning — your progress is tracked automatically.
            </p>
          )}
        </>
      )}
    </div>
  );
}
