import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// Returns a sanitized exercise for the interactive exercise block. Answer keys
// (config) and solutions stay on the server — only what's needed to render is sent.

export const GET = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { key } = await ctx.params;

  const exercise = await prisma.exercise.findUnique({
    where: { key },
    include: { lesson: { select: { isPublished: true } } },
  });
  if (!exercise || !exercise.lesson.isPublished) throw new ApiError("Exercise not found", 404);

  const submission = await prisma.exerciseSubmission.findUnique({
    where: { userId_exerciseId: { userId: session.id, exerciseId: exercise.id } },
    select: { passed: true, score: true, code: true, attempts: true },
  });

  const config = exercise.config as Record<string, unknown>;

  const payload: Record<string, unknown> = {
    id: exercise.id,
    key: exercise.key,
    type: exercise.type,
    title: exercise.title,
    instructions: exercise.instructions,
    starterCode: exercise.starterCode,
    points: exercise.points,
    hints: exercise.hints,
    submission,
  };
  if (exercise.type === "fill_blank") payload.template = config.template;
  if (exercise.type === "code_completion") payload.lines = config.lines;
  if (exercise.type === "ordering") payload.steps = config.steps;

  return payload;
});
