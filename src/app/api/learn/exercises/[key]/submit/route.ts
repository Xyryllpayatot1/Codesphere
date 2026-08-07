import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { validateExercise } from "@/lib/engine/validation";
import { recordExerciseResult } from "@/lib/services/progress";
import { levelFromXp } from "@/lib/engine/xp";
import { XP } from "@/lib/constants";

const bodySchema = z.object({
  code: z.string().max(64_000),
});

// Grades the user's code with the deterministic engine, persists the submission
// and awards XP on first pass. The answer key never leaves the server.

export const POST = handle(async (req, ctx) => {
  const session = await requireSession();
  const { key } = await ctx.params;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError("Invalid submission", 400);
  const { code } = parsed.data;

  const exercise = await prisma.exercise.findUnique({
    where: { key },
    include: { lesson: { select: { id: true, isPublished: true } } },
  });
  if (!exercise || !exercise.lesson.isPublished) throw new ApiError("Exercise not found", 404);

  const result = validateExercise(exercise, code);

  const previous = await prisma.exerciseSubmission.findUnique({
    where: { userId_exerciseId: { userId: session.id, exerciseId: exercise.id } },
    select: { passed: true },
  });

  const userBefore = await prisma.user.findUnique({ where: { id: session.id }, select: { xp: true } });
  const levelBefore = levelFromXp(userBefore?.xp ?? 0).level;

  const { submission } = await recordExerciseResult(session.id, exercise.id, result.passed, code, exercise.lesson.id);

  const userAfter = await prisma.user.findUnique({ where: { id: session.id }, select: { xp: true, streak: true } });
  const levelAfter = levelFromXp(userAfter?.xp ?? 0).level;

  const xpEarned = result.passed && !previous?.passed ? XP.EXERCISE_PASS : 0;

  return {
    result,
    xpEarned,
    levelUp: levelAfter > levelBefore ? levelAfter : null,
    streak: result.passed ? userAfter?.streak : null,
    submission: { passed: submission.passed, score: submission.score, code: submission.code, attempts: submission.attempts },
  };
});
