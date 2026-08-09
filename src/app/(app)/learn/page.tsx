import Link from "next/link";
import { ArrowRight, BookOpen, Compass } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseCard } from "@/components/marketing/course-card";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TRACKS, trackForCourse } from "@/lib/tracks";
import { pathById } from "@/lib/onboarding";
import { FeatureIcon } from "@/components/shared/feature-icon";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const session = await requireSession();

  const [courses, enrollments, lessonProgress, continueLesson, settings] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        category: true,
        _count: { select: { modules: true, lessons: true, enrollments: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
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
    prisma.userSetting.findUnique({ where: { userId: session.id }, select: { learningPath: true } }),
  ]);

  const enrolled = new Set(enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.courseId));
  const doneByCourse = new Map<string, number>();
  for (const l of lessonProgress) {
    if (l.status === "COMPLETED") {
      doneByCourse.set(l.lesson.courseId, (doneByCourse.get(l.lesson.courseId) ?? 0) + 1);
    }
  }

  const userTrack = (settings?.learningPath ? pathById(settings.learningPath)?.track : null) ?? null;
  const orderedTracks = userTrack
    ? [...TRACKS.filter((t) => t.id === userTrack), ...TRACKS.filter((t) => t.id !== userTrack)]
    : TRACKS;

  const grouped = new Map<string, typeof courses>();
  for (const c of courses) {
    const tid = trackForCourse(c);
    grouped.set(tid, [...(grouped.get(tid) ?? []), c]);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
          <p className="mt-1 text-sm text-muted-foreground">Follow a track, one step at a time. Start anywhere — progress saves itself.</p>
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

      {orderedTracks.map((track) => {
        const trackCourses = grouped.get(track.id) ?? [];
        const done = trackCourses.reduce((sum, c) => sum + (doneByCourse.get(c.id) ?? 0), 0);
        const total = trackCourses.reduce((sum, c) => sum + c._count.lessons, 0);
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <section key={track.id} aria-label={track.label}>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${track.color}1a`, color: track.color }}
              >
                <FeatureIcon name={track.icon} className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold tracking-tight">{track.label}</h2>
              <span className="text-xs text-muted-foreground">{track.tagline}</span>
              {track.id === userTrack && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Your path
                </span>
              )}
              {total > 0 && (
                <div className="ml-auto flex min-w-28 items-center gap-2">
                  <Progress value={percent} className="h-1.5 flex-1" />
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {done}/{total} lessons
                  </span>
                </div>
              )}
            </div>

            {trackCourses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                  <Compass className="h-7 w-7 text-muted-foreground/40" />
                  <p className="text-sm font-medium">This track is on the way</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    New courses for {track.label} are being written. Until then, the {userTrack === track.id ? "Web Development" : "Web Development"} track is a great place to start.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trackCourses.map((course) => {
                  const cdone = doneByCourse.get(course.id) ?? 0;
                  const ctotal = course._count.lessons;
                  const progress = ctotal > 0 ? Math.round((cdone / ctotal) * 100) : 0;
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
            )}
          </section>
        );
      })}

      {courses.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            <p className="font-medium">No courses published yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">Check back soon — new paths are on the way.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
