import type { QuizQuestion } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Deterministic quiz grading (server-side — answer keys never reach the client).
// Question config shapes:
//   multiple_choice  { options: string[], answer: number | number[] }  (index or indexes)
//   true_false       { answer: boolean }
//   fill_blank       { blanks: string[] | string[][] }  (accepts any of the alternatives)
//   code_completion  { answer: string }
//   ordering         { items: string[], answer: number[] }  (correct index order)
//   matching         { left: string[], right: string[], answer: number[] }  (left[i] -> right[answer[i]])
// ---------------------------------------------------------------------------

export type QuizAnswerPayload = Record<string, unknown>;

export type QuestionGrade = {
  questionId: string;
  correct: boolean;
  score: number;
  maxScore: number;
  explanation: string | null;
};

export type QuizGrade = {
  questions: QuestionGrade[];
  score: number;
  maxScore: number;
  passed: boolean;
  percentage: number;
};

function normText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function isCorrect(question: Pick<QuizQuestion, "type" | "config">, answer: unknown): boolean {
  const cfg = question.config as Record<string, unknown>;
  switch (question.type) {
    case "multiple_choice": {
      const expected = cfg.answer;
      if (Array.isArray(expected)) {
        return Array.isArray(answer) && answer.length === expected.length && expected.every((v) => answer.includes(v));
      }
      return answer === expected;
    }
    case "true_false":
      return answer === cfg.answer;
    case "fill_blank": {
      const blanks = cfg.blanks as unknown[];
      const given = Array.isArray(answer) ? answer : [answer];
      return blanks.every((expected, i) => {
        const accepts = (Array.isArray(expected) ? expected : [expected]).map((a) => normText(String(a)));
        return accepts.includes(normText(String(given[i] ?? "")));
      });
    }
    case "code_completion":
      return normText(String(answer ?? "")) === normText(String(cfg.answer ?? ""));
    case "ordering": {
      const expected = cfg.answer as number[];
      const given = Array.isArray(answer) ? (answer as unknown[]).map(Number) : [];
      return given.length === expected.length && expected.every((v, i) => given[i] === v);
    }
    case "matching": {
      const expected = cfg.answer as number[];
      const given = Array.isArray(answer) ? (answer as unknown[]).map(Number) : [];
      return given.length === expected.length && expected.every((v, i) => given[i] === v);
    }
    default:
      return false;
  }
}

export function gradeQuiz(
  questions: Pick<QuizQuestion, "id" | "type" | "config" | "points" | "explanation">[],
  answers: QuizAnswerPayload,
  passScore = 70,
): QuizGrade {
  const graded: QuestionGrade[] = questions.map((q) => {
    const maxScore = q.points || 10;
    const correct = isCorrect(q, answers[q.id]);
    return { questionId: q.id, correct, score: correct ? maxScore : 0, maxScore, explanation: q.explanation ?? null };
  });

  const score = graded.reduce((sum, g) => sum + g.score, 0);
  const maxScore = graded.reduce((sum, g) => sum + g.maxScore, 0);
  const percentage = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);

  return {
    questions: graded,
    score,
    maxScore,
    percentage,
    passed: percentage >= passScore,
  };
}

export function quizPassPoints(percentage: number, maxScore: number, passScore: number): number {
  if (percentage < passScore) return 0;
  return maxScore;
}
