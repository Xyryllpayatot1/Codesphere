import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_TYPES, SUBMISSION_STATUS, ROLES, XP_TYPES, COINS } from "@/lib/constants";
import { awardEligibleAchievements } from "@/lib/engine/achievements";
import { awardXp } from "@/lib/engine/rewards";

const bodySchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  feedback: z.string().max(2000).optional(),
});

export const POST = handle(async (req, ctx) => {
  await requireRole(ROLES.ADMIN);
  const { id } = await ctx.params;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError("Invalid review data", 400);
  const { action, feedback } = parsed.data;

  const submission = await prisma.projectSubmission.findUnique({
    where: { id },
    include: { project: { select: { id: true, title: true, xpReward: true, courseId: true } } },
  });
  if (!submission) throw new ApiError("Submission not found", 404);

  const wasApproved = submission.status === SUBMISSION_STATUS.APPROVED;
  const xpReward = action === SUBMISSION_STATUS.APPROVED && !wasApproved ? submission.project.xpReward : 0;

  await prisma.$transaction([
    prisma.projectSubmission.update({
      where: { id },
      data: {
        status: action,
        score: action === SUBMISSION_STATUS.APPROVED ? submission.project.xpReward : null,
        feedback: feedback ?? submission.feedback ?? undefined,
      },
    }),
    ...(xpReward > 0
      ? [
          prisma.activity.create({
            data: {
              userId: submission.userId,
              type: ACTIVITY_TYPES.PROJECT_APPROVED,
              courseId: submission.project.courseId,
              data: { projectId: submission.project.id, title: submission.project.title, score: xpReward },
            },
          }),
          prisma.notification.create({
            data: {
              userId: submission.userId,
              type: "project",
              title: `Project approved: ${submission.project.title}`,
              body: feedback ? `Feedback: ${feedback}` : "Great work — keep building!",
              link: "/projects",
            },
          }),
        ]
      : []),
  ]);

  let award = null;
  if (xpReward > 0) {
    award = await awardXp(submission.userId, {
      amount: xpReward,
      coins: COINS.PROJECT_APPROVED,
      type: XP_TYPES.PROJECT,
      reason: `Project approved: ${submission.project.title}`,
      data: { projectId: submission.project.id, projectTitle: submission.project.title },
    });
    await awardEligibleAchievements(submission.userId);
  }

  return { reviewed: true, status: action, xpAwarded: xpReward, award };
});
