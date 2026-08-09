import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Caches for stable, public course content. The DB sits far away (~260ms per
// round trip), so static catalog data that changes rarely is cached with the
// Next.js Data Cache (unstable_cache — the pre-cacheComponents model). Time
// revalidation (1h) keeps the catalog fresh without an invalidation pipeline.
// User-scoped data is NEVER cached here.
// ---------------------------------------------------------------------------

const COURSE_TTL = 3600;
const COURSE_TAGS = ["courses"];
const LESSON_TAGS = ["lessons"];

/** Full published course tree (modules + lessons + exercise/quiz counts) for a slug. */
export const getCachedCourseTree = unstable_cache(
  async (slug: string) => {
    return prisma.course.findUnique({
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
  },
  ["course-tree"],
  { revalidate: COURSE_TTL, tags: COURSE_TAGS }
);

/** Top courses to suggest on a course detail page (excludes the current course). */
export const getCachedSuggestedCourses = unstable_cache(
  async (excludeId: string) => {
    return prisma.course.findMany({
      where: { id: { not: excludeId }, status: "PUBLISHED" },
      include: { category: true, _count: { select: { modules: true, lessons: true, enrollments: true } } },
      orderBy: { enrollments: { _count: "desc" } },
      take: 3,
    });
  },
  ["suggested"],
  { revalidate: COURSE_TTL, tags: COURSE_TAGS }
);

/** Course categories with course counts. */
export const getCachedCategories = unstable_cache(
  async () => {
    return prisma.category.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { order: "asc" },
    });
  },
  ["categories"],
  { revalidate: COURSE_TTL, tags: COURSE_TAGS }
);

/** The default (unfiltered, popular) course listing shown when no filters are active. */
export const getCachedCourseListing = unstable_cache(
  async () => {
    return prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: { category: true, _count: { select: { modules: true, lessons: true, enrollments: true } } },
      orderBy: { enrollments: { _count: "desc" } },
    });
  },
  ["course-listing"],
  { revalidate: COURSE_TTL, tags: COURSE_TAGS }
);

/** Featured courses on the landing page. */
export const getCachedFeaturedCourses = unstable_cache(
  async () => {
    return prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: { category: true, _count: { select: { modules: true, lessons: true, enrollments: true } } },
      orderBy: { order: "asc" },
      take: 6,
    });
  },
  ["featured-courses"],
  { revalidate: COURSE_TTL, tags: COURSE_TAGS }
);

/** Cached lesson content lookup (public; keyed by slugs only). */
export const getCachedLessonBySlug = unstable_cache(
  async (courseSlug: string, moduleSlug: string, lessonSlug: string) => {
    return prisma.lesson.findFirst({
      where: { slug: lessonSlug, module: { slug: moduleSlug, course: { slug: courseSlug } } },
      include: {
        module: { select: { id: true, title: true, courseId: true, order: true, slug: true } },
        course: { select: { id: true, title: true, slug: true, language: true } },
      },
    });
  },
  ["lesson-by-slug"],
  { revalidate: COURSE_TTL, tags: LESSON_TAGS }
);

/** Cached course module/lesson structure used by the lesson sidebar. */
export const getCachedCourseStructure = unstable_cache(
  async (courseId: string) => {
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
  },
  ["course-structure"],
  { revalidate: COURSE_TTL, tags: LESSON_TAGS }
);
