import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { gradeQuiz, type QuizAnswerPayload } from "@/lib/engine/quiz/grade";
import { recordQuizAttempt } from "@/lib/services/progress";
import { levelFromXp } from "@/lib/engine/xp";
import { XP } from "@/lib/constants";

export const POST = handle(async (req, ctx) => {
  const session = await requireSession();
  const { key } = await ctx.params;

  let answers: unknown;
  try {
    const body = await req.json();
    answers = body?.answers;
  } catch {
    throw new ApiError("Invalid submission", 400);
  }
  if (typeof answers !== "object" || answers === null) {
    throw new ApiError("Invalid submission", 400);
  }

  const quiz = await prisma.quiz.findUnique({
    where: { key },
    include: {
      questions: { orderBy: { order: "asc" } },
      lesson: { select: { id: true, isPublished: true } },
    },
  });
  if (!quiz || !quiz.isPublished || (quiz.lessonId && !quiz.lesson?.isPublished)) {
    throw new ApiError("Quiz not found", 404);
  }

  const grade = gradeQuiz(quiz.questions, answers as QuizAnswerPayload, quiz.passScore);

  const userBefore = await prisma.user.findUnique({ where: { id: session.id }, select: { xp: true } });
  const levelBefore = levelFromXp(userBefore?.xp ?? 0).level;

  await recordQuizAttempt(session.id, quiz.id, quiz.lessonId, grade.score, grade.maxScore, answers, grade.passed);

  const userAfter = await prisma.user.findUnique({ where: { id: session.id }, select: { xp: true, streak: true } });
  const levelAfter = levelFromXp(userAfter?.xp ?? 0).level;

  const xpEarned = grade.passed ? XP.QUIZ_PASS : 0;

  return {
    percentage: grade.percentage,
    passed: grade.passed,
    score: grade.score,
    maxScore: grade.maxScore,
    xpEarned,
    levelUp: levelAfter > levelBefore ? levelAfter : null,
    streak: grade.passed ? userAfter?.streak : null,
    questions: grade.questions.map((q) => ({
      questionId: q.questionId,
      correct: q.correct,
      explanation: q.explanation,
    })),
  };
});
