import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { QUIZ_QUESTION_TYPES } from "@/lib/constants";

// Returns a sanitized quiz. Question answer keys are stripped — only render
// data (options, blank counts, items) leaves the server.

function sanitizeQuestion(q: { id: string; type: string; prompt: string; code: string | null; points: number; config: unknown }) {
  const cfg = q.config as Record<string, unknown>;
  const render: Record<string, unknown> = {};

  switch (q.type) {
    case QUIZ_QUESTION_TYPES.MULTIPLE_CHOICE:
      render.options = cfg.options;
      render.multi = Array.isArray(cfg.answer);
      break;
    case QUIZ_QUESTION_TYPES.TRUE_FALSE:
      break;
    case QUIZ_QUESTION_TYPES.FILL_BLANK:
      render.count = Array.isArray(cfg.blanks) ? cfg.blanks.length : 1;
      break;
    case QUIZ_QUESTION_TYPES.ORDERING:
      render.items = cfg.items;
      break;
    case QUIZ_QUESTION_TYPES.MATCHING:
      render.left = cfg.left;
      render.right = cfg.right;
      break;
  }

  return { id: q.id, type: q.type, prompt: q.prompt, code: q.code, points: q.points, render };
}

export const GET = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { key } = await ctx.params;

  const quiz = await prisma.quiz.findUnique({
    where: { key },
    include: {
      questions: { orderBy: { order: "asc" } },
      lesson: { select: { isPublished: true } },
    },
  });
  if (!quiz || !quiz.isPublished || (quiz.lessonId && !quiz.lesson?.isPublished)) {
    throw new ApiError("Quiz not found", 404);
  }

  const previousPass = await prisma.quizAttempt.findFirst({
    where: { userId: session.id, quizId: quiz.id, passed: true },
    select: { id: true },
  });

  return {
    id: quiz.id,
    key: quiz.key,
    title: quiz.title,
    description: quiz.description,
    passScore: quiz.passScore,
    points: quiz.points,
    timeLimit: quiz.timeLimit,
    previousPassed: previousPass != null,
    questions: quiz.questions.map(sanitizeQuestion),
  };
});
