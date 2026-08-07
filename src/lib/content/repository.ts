import "server-only";

import { prisma } from "@/lib/prisma";
import type { ContentBlock } from "@/lib/content/types";

// ---------------------------------------------------------------------------
// Content repository — server-side accessors for lesson content, exercises and
// quizzes. Never returns answer keys or solutions to the client; those stay
// inside the validation API routes.
// ---------------------------------------------------------------------------

export function parseContent(json: unknown): ContentBlock[] {
  if (!Array.isArray(json)) return [];
  return json as ContentBlock[];
}

export async function getExerciseByKey(key: string) {
  return prisma.exercise.findUnique({
    where: { key },
    include: { lesson: { select: { id: true, title: true, courseId: true } } },
  });
}

export async function getQuizByKey(key: string) {
  return prisma.quiz.findUnique({
    where: { key },
    include: {
      questions: { orderBy: { order: "asc" } },
      lesson: { select: { id: true, title: true, courseId: true } },
    },
  });
}

export async function getLessonById(id: string) {
  return prisma.lesson.findUnique({
    where: { id },
    include: {
      module: { select: { id: true, title: true, courseId: true, order: true } },
      course: { select: { id: true, title: true, slug: true, language: true } },
    },
  });
}

export async function getLessonBySlug(courseSlug: string, moduleSlug: string, lessonSlug: string) {
  return prisma.lesson.findFirst({
    where: { slug: lessonSlug, module: { slug: moduleSlug, course: { slug: courseSlug } } },
    include: {
      module: { select: { id: true, title: true, courseId: true, order: true, slug: true } },
      course: { select: { id: true, title: true, slug: true, language: true } },
    },
  });
}

/** Ordered modules with lessons, used for the lesson sidebar. */
export async function getCourseStructure(courseId: string) {
  return prisma.module.findMany({
    where: { courseId },
    include: {
      lessons: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: { id: true, title: true, slug: true, order: true, estimatedMinutes: true, isPublished: true },
      },
    },
    orderBy: { order: "asc" },
  });
}

/** Next/previous lesson within a course, respecting module order. */
export async function getAdjacentLessons(courseId: string, lessonId: string) {
  const modules = await getCourseStructure(courseId);
  const flat = modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
  const idx = flat.findIndex((l) => l.id === lessonId);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}
