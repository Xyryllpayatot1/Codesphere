import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";

const masteryConfigSchema = z
  .object({
    lessonWeight: z.number().int().min(0).optional(),
    gameWeight: z.number().int().min(0).optional(),
    perfectGameBonus: z.number().int().min(0).optional(),
    quizWeight: z.number().int().min(0).optional(),
    perfectQuizBonus: z.number().int().min(0).optional(),
    projectWeight: z.number().int().min(0).optional(),
    bossWeight: z.number().int().min(0).optional(),
    practiceWeight: z.number().int().min(0).optional(),
    quizFailPenalty: z.number().int().min(0).optional(),
  })
  .strict();

const bodySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
    icon: z.string().max(40).optional(),
    color: z.string().max(20).optional(),
    difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
    order: z.number().int().min(0).optional(),
    rewardXp: z.number().int().min(0).optional(),
    rewardCoins: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    courseSlugs: z.array(z.string().min(1)).optional(),
    unlockCriteria: z.record(z.string(), z.unknown()).nullable().optional(),
    masteryConfig: masteryConfigSchema.nullable().optional(),
    bossGameId: z.string().nullable().optional(),
  })
  .strict();

export const PATCH = handle(async (req, ctx) => {
  await requireRole(ROLES.ADMIN);
  const { id } = await ctx.params;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError("Invalid world data", 400, parsed.error.flatten());
  const { bossGameId, ...rest } = parsed.data;

  const world = await prisma.world.findUnique({ where: { id } });
  if (!world) throw new ApiError("World not found", 404);

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) data[key] = value;
  }

  if (bossGameId !== undefined && bossGameId !== null) {
    const game = await prisma.game.findUnique({ where: { id: bossGameId } });
    if (!game || game.worldId !== world.id) throw new ApiError("Boss game must belong to this world", 400);
  }

  const ops = [
    prisma.world.update({ where: { id }, data }),
    ...(bossGameId !== undefined
      ? [prisma.game.updateMany({ where: { worldId: world.id, isBoss: true }, data: { isBoss: false } })]
      : []),
    ...(bossGameId
      ? [prisma.game.update({ where: { id: bossGameId }, data: { isBoss: true, isActive: true } })]
      : []),
  ];
  await prisma.$transaction(ops);

  return { updated: true, id: world.id };
});

export async function GET() {
  return Response.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function POST() {
  return Response.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function DELETE() {
  return Response.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function PUT() {
  return Response.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}
