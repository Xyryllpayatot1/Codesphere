import "server-only";

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { XP, XP_TYPES, COINS, ACTIVITY_TYPES, LESSON_STATUS } from "@/lib/constants";
import { updateStreak, isStreakMilestone } from "@/lib/engine/streak";
import { awardEligibleAchievements } from "@/lib/engine/achievements";
import { awardXp, awardCoins } from "@/lib/engine/rewards";
import { progressMission, MISSION_TYPES } from "@/lib/engine/missions";
import { recordWorldLesson, recordWorldQuiz, recordWorldPractice } from "@/lib/engine/worlds";
import { toDateKey } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Progress service: transactional orchestration of every learning event.
// All mutations funnel through here so XP, streaks, achievements, activities
// and course-completion are always consistent.
// ---------------------------------------------------------------------------

export async function touchLesson(userId: string, lessonId: string): Promise<void> {
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, status: LESSON_STATUS.IN_PROGRESS, startedAt: new Date(), lastAccessedAt: new Date() },
    update: { lastAccessedAt: new Date() },
  });
}

export async function recordExerciseResult(
  userId: string,
  exerciseId: string,
  passed: boolean,
  code: string,
  lessonId: string
) {
  const existing = await prisma.exerciseSubmission.findUnique({
    where: { userId_exerciseId: { userId, exerciseId } },
  });

  const submission = await prisma.exerciseSubmission.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: { userId, exerciseId, code, passed, attempts: 1 },
    update: {
      code,
      passed: existing?.passed ? true : passed, // a first pass is never downgraded
      attempts: (existing?.attempts ?? 0) + 1,
    },
  });

  const firstPass = passed && !existing?.passed;
  if (firstPass) {
    await prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.EXERCISE_COMPLETED, lessonId, data: { exerciseId } },
    });
    const lineCount = Math.max(1, code.split("\n").length);
    await prisma.user.update({ where: { id: userId }, data: { linesOfCode: { increment: lineCount } } });
    await awardXp(userId, { amount: XP.EXERCISE_PASS, coins: COINS.EXERCISE_PASS, type: XP_TYPES.EXERCISE, reason: "Exercise passed" });
    await progressMission(userId, MISSION_TYPES.PASS_EXERCISE, 1);
  }

  // Recompute per-lesson exercise counters + progress.
  const [exercise, submissions] = await Promise.all([
    prisma.exercise.findUnique({ where: { id: exerciseId } }),
    prisma.exerciseSubmission.count({ where: { userId, exercise: { lessonId }, passed: true } }),
  ]);
  const total = await prisma.exercise.count({ where: { lessonId } });
  const progress = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      status: LESSON_STATUS.IN_PROGRESS,
      exercisesCompleted: submissions,
      exercisesTotal: total,
      startedAt: new Date(),
      lastAccessedAt: new Date(),
    },
    update: {
      exercisesCompleted: submissions,
      exercisesTotal: total,
      lastAccessedAt: new Date(),
      progressPercent: Math.max(progress?.progressPercent ?? 0, computeLessonPercent(submissions, total)),
    },
  });
  await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });

  return { submission, firstPass, lessonXp: exercise?.points ?? 0 };
}

export async function recordQuizAttempt(
  userId: string,
  quizId: string,
  lessonId: string | null,
  score: number,
  maxScore: number,
  answers: unknown,
  passed: boolean
) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { courseId: true } });
  // XP/coins/missions are only ever awarded once — on the first passing attempt.
  const existingPass = await prisma.quizAttempt.findFirst({
    where: { userId, quizId, passed: true },
    select: { id: true },
  });
  const attempt = await prisma.quizAttempt.create({
    data: { userId, quizId, score, maxScore, passed, answers: answers as never },
    select: { id: true, passed: true, score: true, maxScore: true },
  });
  const firstPass = passed && !existingPass;

  if (firstPass) {
    await prisma.activity.create({
      data: {
        userId,
        type: ACTIVITY_TYPES.QUIZ_PASSED,
        lessonId,
        data: { quizId, score, maxScore },
      },
    });
    if (lessonId) {
      const progress = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId, status: LESSON_STATUS.IN_PROGRESS, quizzesPassed: 1, startedAt: new Date(), lastAccessedAt: new Date() },
        update: { quizzesPassed: (progress?.quizzesPassed ?? 0) + 1, lastAccessedAt: new Date() },
      });
    }
    const perfect = maxScore > 0 && score >= maxScore;
    await awardXp(userId, {
      amount: XP.QUIZ_PASS,
      coins: COINS.QUIZ_PASS + (perfect ? COINS.QUIZ_PERFECT : 0),
      type: XP_TYPES.QUIZ,
      reason: perfect ? "Perfect quiz" : "Quiz passed",
      data: { quizId, score, maxScore, perfect },
    });
    await progressMission(userId, MISSION_TYPES.PASS_QUIZ, 1);
  } else if (!passed) {
    await prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.QUIZ_FAILED, lessonId, data: { quizId, score, maxScore } },
    });
  }
  await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });

  const perfect = maxScore > 0 && score >= maxScore;
  await recordWorldQuiz(userId, quizId, quiz?.courseId ?? null, passed, perfect);

  return { attempt, passed, firstPass };
}

export function computeLessonPercent(exercisesCompleted: number, exercisesTotal: number): number {
  if (exercisesTotal === 0) return 50;
  return Math.min(100, Math.round((exercisesCompleted / exercisesTotal) * 100));
}

/**
 * Completes a lesson once its exercises and quizzes are satisfied.
 * Awards XP, advances the streak, fires activities/achievements, and checks
 * whether the whole course is finished (which issues a certificate).
 */
export async function completeLesson(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      slug: true,
      xpReward: true,
      courseId: true,
      exercises: { where: { isOptional: false }, select: { id: true } },
      quizzes: { select: { id: true } },
    },
  });
  if (!lesson) throw new Error("Lesson not found");

  const [exerciseSubs, quizAttempts] = await Promise.all([
    prisma.exerciseSubmission.findMany({
      where: { userId, exercise: { lessonId }, passed: true },
      select: { exerciseId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId, quiz: { lessonId }, passed: true },
      select: { quizId: true },
    }),
  ]);

  const passedExerciseIds = new Set(exerciseSubs.map((s) => s.exerciseId));
  const passedQuizIds = new Set(quizAttempts.map((a) => a.quizId));

  const missingExercises = lesson.exercises.filter((e) => !passedExerciseIds.has(e.id));
  const missingQuizzes = lesson.quizzes.filter((q) => !passedQuizIds.has(q.id));

  if (missingExercises.length > 0 || missingQuizzes.length > 0) {
    return {
      completed: false,
      reason: `Complete ${missingExercises.length} more exercise(s) and ${missingQuizzes.length} quiz(zes) to finish this lesson.`,
      missingExercises: missingExercises.length,
      missingQuizzes: missingQuizzes.length,
    } as const;
  }

  const existing = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  if (existing?.status === LESSON_STATUS.COMPLETED) {
    return { completed: true, reason: "already_completed" } as const;
  }

  // Ensure the row exists so the atomic claim below can match it.
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, status: LESSON_STATUS.IN_PROGRESS, startedAt: new Date(), lastAccessedAt: new Date() },
    update: { lastAccessedAt: new Date() },
  });

  // Atomically claim the COMPLETED transition. If two requests race (e.g.
  // double-clicking "Complete lesson"), only one updateMany matches a
  // non-completed row, so XP/streak/activities are never awarded twice.
  const claimed = await prisma.lessonProgress.updateMany({
    where: { userId, lessonId, status: { not: LESSON_STATUS.COMPLETED } },
    data: { status: LESSON_STATUS.COMPLETED, progressPercent: 100, completedAt: new Date(), lastAccessedAt: new Date() },
  });
  if (claimed.count === 0) {
    return { completed: true, reason: "already_completed" } as const;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const streak = updateStreak(user?.streak ?? 0, user?.longestStreak ?? 0, user?.lastActiveAt ?? null);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        streak: streak.streak,
        longestStreak: streak.longestStreak,
        lastActiveAt: new Date(),
      },
    }),
    prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.LESSON_COMPLETED, lessonId, courseId: lesson.courseId, data: { title: lesson.title } },
    }),
  ]);

  const award = await awardXp(userId, {
    amount: lesson.xpReward,
    coins: COINS.LESSON_COMPLETE,
    type: XP_TYPES.LESSON,
    reason: `Lesson: ${lesson.title}`,
    data: { lessonId, lessonTitle: lesson.title },
  });
  await progressMission(userId, MISSION_TYPES.COMPLETE_LESSON, 1);
  await recordWorldLesson(userId, lesson.courseId);

  if (isStreakMilestone(streak.streak)) {
    await prisma.activity.create({
      data: {
        userId,
        type: ACTIVITY_TYPES.STREAK_MILESTONE,
        data: { streak: streak.streak },
      },
    });
    await awardCoins(userId, {
      amount: COINS.STREAK_MILESTONE,
      type: XP_TYPES.STREAK,
      reason: `${streak.streak}-day streak milestone`,
      data: { streak: streak.streak },
    });
  }

  const courseResult = await checkCourseCompletion(userId, lesson.courseId);
  const achievementAward = await awardEligibleAchievements(userId);

  return {
    completed: true,
    reason: "ok",
    xpAwarded: lesson.xpReward,
    streak,
    newAchievements: achievementAward.awarded,
    achievementXp: achievementAward.xpAwarded,
    course: courseResult,
    award,
  } as const;
}

/** Marks a course complete when every published lesson is done → issues a certificate. */
async function checkCourseCompletion(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, slug: true },
  });
  if (!course) return null;

  const [total, completed, existingCert] = await Promise.all([
    prisma.lesson.count({ where: { courseId, isPublished: true } }),
    prisma.lessonProgress.count({ where: { userId, lesson: { courseId, isPublished: true }, status: LESSON_STATUS.COMPLETED } }),
    prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } }),
  ]);

  const done = total > 0 && completed >= total;
  if (!done) return { completed: false, progress: { completed, total } };

  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, status: "COMPLETED", progress: 100, completedAt: new Date() },
    update: { status: "COMPLETED", progress: 100, completedAt: new Date() },
  });

  if (enrollment?.status === "COMPLETED" && existingCert) {
    return { completed: true, already: true, progress: { completed, total } };
  }

  const code = `CS-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const certificate = await prisma.certificate.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, title: course.title, code },
    update: {},
  });

  await prisma.$transaction([
    prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.CERTIFICATE_EARNED, courseId, data: { courseTitle: course.title, code: certificate.code } },
    }),
    prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.COURSE_COMPLETED, courseId, data: { courseTitle: course.title } },
    }),
  ]);

  return { completed: true, already: false, certificate, progress: { completed, total } };
}

/** Records active study time; advances the streak once per day. */
export async function recordStudyTime(
  userId: string,
  source: string,
  seconds: number,
  courseId?: string | null,
  lessonId?: string | null
) {
  const startedAt = new Date(Date.now() - seconds * 1000);
  const endedAt = new Date();

  const [user, existingToday] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.studySession.count({
      where: { userId, startedAt: { gte: startOfLocalDay() } },
    }),
  ]);

  await prisma.studySession.create({
    data: { userId, source, durationSeconds: seconds, startedAt, endedAt, courseId, lessonId },
  });

  const isFirstToday = existingToday === 0 && seconds > 5;
  let streakChanged = false;
  let streakInfo = null;

  if (isFirstToday && user) {
    const streak = updateStreak(user.streak, user.longestStreak, user.lastActiveAt);
    streakInfo = streak;
    streakChanged = true;
    await prisma.user.update({
      where: { id: userId },
      data: {
        streak: streak.streak,
        longestStreak: streak.longestStreak,
        lastActiveAt: endedAt,
      },
    });
    await prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.STUDY_DAY, data: { date: toDateKey(endedAt) } },
    });
    await awardXp(userId, { amount: XP.LOGIN, coins: COINS.DAILY_LOGIN, type: XP_TYPES.DAILY_LOGIN, reason: "Daily login" });
    await recordWorldPractice(userId);
    if (isStreakMilestone(streak.streak)) {
      await prisma.activity.create({ data: { userId, type: ACTIVITY_TYPES.STREAK_MILESTONE, data: { streak: streak.streak } } });
      await awardCoins(userId, { amount: COINS.STREAK_MILESTONE, type: XP_TYPES.STREAK, reason: `${streak.streak}-day streak milestone`, data: { streak: streak.streak } });
    }
  } else if (user) {
    await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: endedAt } });
  }

  await progressMission(userId, MISSION_TYPES.STUDY_MINUTES, Math.floor(Math.max(0, seconds) / 60));

  const award = streakChanged ? await awardEligibleAchievements(userId) : { awarded: [], xpAwarded: 0 };

  return { streak: streakInfo, streakChanged, awards: award.awarded };
}

function startOfLocalDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function enrollInCourse(userId: string, courseSlug: string) {
  const course = await prisma.course.findUnique({ where: { slug: courseSlug } });
  if (!course) throw new Error("Course not found");

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId: course.id } },
    create: { userId, courseId: course.id },
    update: {},
  });

  return { course, enrollment };
}

export async function courseProgress(userId: string, courseId: string) {
  const [total, completed, enrollment] = await Promise.all([
    prisma.lesson.count({ where: { courseId, isPublished: true } }),
    prisma.lessonProgress.count({ where: { userId, lesson: { courseId, isPublished: true }, status: LESSON_STATUS.COMPLETED } }),
    prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } }),
  ]);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent, status: enrollment?.status ?? "NOT_ENROLLED" };
}
