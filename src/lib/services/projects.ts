import "server-only";

import { prisma } from "@/lib/prisma";
import { validateExercise } from "@/lib/engine/validation";
import { ACTIVITY_TYPES, SUBMISSION_STATUS, XP_TYPES, COINS } from "@/lib/constants";
import { awardEligibleAchievements } from "@/lib/engine/achievements";
import { awardXp } from "@/lib/engine/rewards";
import { recordWorldProject } from "@/lib/engine/worlds";
import type { XpAwardOutcome } from "@/lib/engine/rewards";

export type ProjectSubmitResult = {
  status: string;
  passed: boolean;
  feedback: string[];
  xpAwarded: number;
  firstApproval: boolean;
  submissionId: string;
  award: XpAwardOutcome;
};

/**
 * Submits a project for the user. Deterministic checks (when the project
 * config includes a js_assert test) auto-approve on success; otherwise the
 * submission is queued for admin review. First approval awards XP.
 */
export async function submitProject(
  userId: string,
  projectId: string,
  code: string,
  description?: string
): Promise<ProjectSubmitResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true, xpReward: true, config: true, courseId: true },
  });
  if (!project) throw new Error("Project not found");

  const config = project.config as { kind?: string; test?: string };

  let passed = false;
  let feedback: string[] = [];

  if (config.kind === "js_assert" && typeof config.test === "string") {
    const result = validateExercise({ type: "js_assert", config, points: project.xpReward }, code);
    passed = result.passed;
    feedback = result.feedback;
  }

  const status = passed ? SUBMISSION_STATUS.APPROVED : SUBMISSION_STATUS.SUBMITTED;

  const existing = await prisma.projectSubmission.findFirst({
    where: { userId, projectId },
    select: { id: true, status: true },
    orderBy: { submittedAt: "desc" },
  });

  const submission = await prisma.projectSubmission.upsert({
    where: existing?.id ? { id: existing.id } : { id: "__none__" },
    create: { userId, projectId, code, description, status, score: passed ? project.xpReward : null },
    update: {
      code,
      description: description ?? undefined,
      status,
      score: passed ? project.xpReward : null,
      submittedAt: new Date(),
    },
  });

  const firstApproval = passed && existing?.status !== SUBMISSION_STATUS.APPROVED;
  let xpAwarded = 0;
  let award: XpAwardOutcome = {
    xpAwarded: 0,
    coinsAwarded: 0,
    levelUpCoins: 0,
    currentXp: 0,
    level: 1,
    leveledUp: false,
    gainedLevels: 0,
    progress: 0,
    needed: 0,
    newTitles: 0,
  };

  if (firstApproval) {
    xpAwarded = project.xpReward;
    await prisma.activity.create({
      data: {
        userId,
        type: ACTIVITY_TYPES.PROJECT_APPROVED,
        courseId: project.courseId,
        data: { projectId, title: project.title, score: project.xpReward },
      },
    });
    award = await awardXp(userId, {
      amount: xpAwarded,
      coins: COINS.PROJECT_APPROVED,
      type: XP_TYPES.PROJECT,
      reason: `Project approved: ${project.title}`,
      data: { projectId, projectTitle: project.title },
    });
    await awardEligibleAchievements(userId);
    await recordWorldProject(userId, project.courseId);
  } else if (!passed) {
    await prisma.activity.create({
      data: {
        userId,
        type: ACTIVITY_TYPES.PROJECT_SUBMITTED,
        courseId: project.courseId,
        data: { projectId, title: project.title },
      },
    });
  }

  return { status, passed, feedback, xpAwarded, firstApproval, submissionId: submission.id, award };
}
