import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { completeLesson } from "@/lib/services/progress";

// Completes a lesson when all its required exercises/quizzes are done.
// Returns the full result (xp, streak, achievements, course completion).

export const POST = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { id: true, courseId: true, isPublished: true },
  });
  if (!lesson || !lesson.isPublished) throw new ApiError("Lesson not found", 404);

  return completeLesson(session.id, lesson.id);
});
