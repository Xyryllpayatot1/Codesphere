import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { EXPERIENCE_LEVELS, LEARNING_PATHS } from "@/lib/onboarding";

const onboardingSchema = z.object({
  learningPath: z.enum(LEARNING_PATHS.map((p) => p.id) as [string, ...string[]]),
  experience: z.enum(EXPERIENCE_LEVELS.map((e) => e.id) as [string, ...string[]]),
  dailyGoalMinutes: z.number().int().min(10).max(240),
});

export async function POST(req: Request) {
  const session = await requireRole(ROLES.STUDENT);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 400, parsed.error.flatten().fieldErrors);
  }

  const { learningPath, experience, dailyGoalMinutes } = parsed.data;

  await prisma.userSetting.upsert({
    where: { userId: session.id },
    create: {
      userId: session.id,
      learningPath,
      experience,
      dailyGoalMinutes,
      weeklyGoalMinutes: dailyGoalMinutes * 7,
      onboardedAt: new Date(),
      notifications: {},
    },
    update: {
      learningPath,
      experience,
      dailyGoalMinutes,
      weeklyGoalMinutes: dailyGoalMinutes * 7,
      onboardedAt: new Date(),
    },
  });

  return ok({ done: true });
}
