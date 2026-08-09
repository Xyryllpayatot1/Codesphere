import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedLessonBySlug, getCachedCourseStructure } from "@/lib/content/course-cache";
import { getAdjacentLessons, parseContent } from "@/lib/content/repository";
import { makePerf } from "@/lib/perf";
import { touchLesson } from "@/lib/services/progress";
import { LEARNING_MODES, LEARNING_MODE_VALUES, type LearningMode } from "@/lib/content/modes";
import { LessonModePanel } from "@/components/learning/lesson/lesson-mode-panel";
import { CourseRail, Breadcrumb, type RailModule, type CompletedMap } from "@/components/learning/lesson/course-rail";
import { CompleteLessonButton } from "@/components/learning/lesson/complete-lesson";
import { StudyTracker } from "@/components/learning/lesson/study-tracker";
import { Button } from "@/components/ui/button";
import { DifficultyPill } from "@/components/shared/gamification";
import { LESSON_STATUS } from "@/lib/constants";

export default async function LessonPage({ params }: PageProps<"/learn/[course]/[module]/[lesson]">) {
  const perf = makePerf("lesson page");
  const { course: courseSlug, module: moduleSlug, lesson: lessonSlug } = await params;

  // requireSession is JWT-only (no DB round trip), so it runs in parallel with
  // the lesson lookup — one round trip total instead of two sequential ones.
  const [session, lesson] = await Promise.all([
    requireSession(),
    getCachedLessonBySlug(courseSlug, moduleSlug, lessonSlug),
  ]);
  perf("session + lesson");
  if (!lesson || !lesson.isPublished || !lesson.course) notFound();
  const course = lesson.course;

  // Mark lesson as in-progress (no throw on first visit). Runs inside the batch
  // so the write does not add a separate sequential round trip.
  const [structure, progressRows, counters, userSetting] = await Promise.all([
    getCachedCourseStructure(lesson.courseId),
    prisma.lessonProgress.findMany({
      where: { userId: session.id, lesson: { courseId: lesson.courseId } },
      select: { lessonId: true, status: true },
    }),
    // Read-only counters — no transaction needed; independent pooled reads avoid
    // pinning a single connection for the whole batch under pooler concurrency.
    Promise.all([
      prisma.exercise.count({ where: { lessonId: lesson.id, isOptional: false } }),
      prisma.exerciseSubmission.count({ where: { userId: session.id, exercise: { lessonId: lesson.id }, passed: true } }),
      prisma.quiz.count({ where: { lessonId: lesson.id } }),
      prisma.quizAttempt.count({ where: { userId: session.id, quiz: { lessonId: lesson.id }, passed: true } }),
    ]).catch(() => [0, 0, 0, 0]),
    prisma.userSetting.findUnique({ where: { userId: session.id } }),
    touchLesson(session.id, lesson.id).catch(() => {}),
  ]);
  perf("structure/progress/counters/settings + touch");

  // Pure in-memory derivation from the structure already loaded above.
  const adjacency = getAdjacentLessons(structure, lesson.id);

  const prefMode = (userSetting?.learningMode ?? LEARNING_MODES.READING) as LearningMode;
  const initialMode: LearningMode = LEARNING_MODE_VALUES.includes(prefMode) ? prefMode : LEARNING_MODES.READING;

  const completedMap: CompletedMap = Object.fromEntries(progressRows.map((p) => [p.lessonId, p.status === LESSON_STATUS.COMPLETED]));
  const modules: RailModule[] = structure.map((m) => ({
    id: m.id,
    title: m.title,
    slug: m.slug,
    order: m.order,
    lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, slug: l.slug, order: l.order, estimatedMinutes: l.estimatedMinutes })),
  }));

  const [totalExercises, doneExercises, totalQuizzes, doneQuizzes] = counters;
  const hasRequired = totalExercises > 0 || totalQuizzes > 0;
  const allDone = doneExercises >= totalExercises && doneQuizzes >= totalQuizzes;

  const blocks = parseContent(lesson.content);
  const isCompleted = !!completedMap[lesson.id];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <StudyTracker courseId={lesson.courseId} lessonId={lesson.id} />
      <CourseRail courseSlug={course.slug} modules={modules} activeLessonId={lesson.id} completed={completedMap} />

      <article className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8">
        <Breadcrumb courseTitle={course.title} moduleTitle={lesson.module.title} courseSlug={course.slug} />

        <header className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <DifficultyPill difficulty={lesson.difficulty} />
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {lesson.estimatedMinutes} min
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
          {lesson.description && <p className="mt-3 text-lg text-muted-foreground">{lesson.description}</p>}
          {(lesson.objectives as string[] | null)?.length ? (
            <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {(lesson.objectives as string[]).map((obj) => (
                <li key={obj} className="flex gap-2 text-sm text-foreground/85">
                  <span className="text-primary">•</span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        <LessonModePanel
          lessonId={lesson.id}
          blocks={blocks}
          initialMode={initialMode}
          initialInstructorMode={userSetting?.instructorMode ?? false}
        />

        <footer className="mt-10 space-y-6 border-t border-border pt-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <CompleteLessonButton
              lessonId={lesson.id}
              initiallyCompleted={isCompleted}
              disabled={hasRequired && !allDone}
            />
          </div>

          <nav className="flex items-center justify-between gap-3">
            {adjacency.prev ? (
              <Button asChild variant="outline">
                <Link href={`/learn/${courseSlug}/${modules.find((m) => m.id === adjacency.prev!.moduleId)?.slug ?? moduleSlug}/${adjacency.prev.slug}`}>
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {adjacency.next ? (
              <Button asChild>
                <Link href={`/learn/${courseSlug}/${modules.find((m) => m.id === adjacency.next!.moduleId)?.slug ?? moduleSlug}/${adjacency.next.slug}`}>
                  Next lesson <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href={`/courses/${course.slug}`}>Course overview</Link>
              </Button>
            )}
          </nav>
        </footer>
      </article>
    </div>
  );
}
