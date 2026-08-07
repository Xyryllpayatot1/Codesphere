import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { LEARNING_MODES } from "@/lib/content/modes";

const bodySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  bio: z.string().max(500).nullable().optional(),
  dailyGoalMinutes: z.number().int().min(5).max(600).optional(),
  preferredTime: z.enum(["any", "morning", "afternoon", "evening"]).optional(),
  learningMode: z.enum(Object.values(LEARNING_MODES) as [string, ...string[]]).optional(),
  instructorMode: z.boolean().optional(),
});

export const PATCH = handle(async (req) => {
  const session = await requireSession();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError("Invalid profile data", 400);

  const { name, bio, dailyGoalMinutes, preferredTime, learningMode, instructorMode } = parsed.data;

  if (name !== undefined || bio !== undefined) {
    await prisma.user.update({
      where: { id: session.id },
      data: { ...(name !== undefined ? { name } : {}), ...(bio !== undefined ? { bio } : {}) },
    });
  }

  if (dailyGoalMinutes !== undefined || preferredTime !== undefined || learningMode !== undefined || instructorMode !== undefined) {
    await prisma.userSetting.upsert({
      where: { userId: session.id },
      create: {
        userId: session.id,
        dailyGoalMinutes: dailyGoalMinutes ?? 30,
        preferredTime: preferredTime ?? "any",
        learningMode: learningMode ?? LEARNING_MODES.READING,
        instructorMode: instructorMode ?? false,
        notifications: {},
      },
      update: {
        ...(dailyGoalMinutes !== undefined ? { dailyGoalMinutes } : {}),
        ...(preferredTime !== undefined ? { preferredTime } : {}),
        ...(learningMode !== undefined ? { learningMode } : {}),
        ...(instructorMode !== undefined ? { instructorMode } : {}),
      },
    });
  }

  return { saved: true };
});
