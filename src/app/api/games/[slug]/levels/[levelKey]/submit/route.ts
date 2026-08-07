import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { levelFromXp } from "@/lib/engine/xp";
import { evaluateUnlock } from "@/lib/games/unlock";
import { levelStates, submitGameLevel } from "@/lib/games/progress";
import { buildUnlockContext } from "@/lib/engine/worlds";
import type { GameSubmission } from "@/lib/games/types";

// The submission shape is interpreted by the deterministic grader for the
// game's kind (order / selected / code / answers). Loose at the API boundary,
// strictly interpreted inside the engine.
const bodySchema = z
  .object({
    kind: z.string(),
    order: z.array(z.string()).optional(),
    selected: z.array(z.string()).optional(),
    code: z.string().max(64_000).optional(),
    answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    seconds: z.number().int().min(0).max(86_400).optional().default(0),
  })
  .strict();

export const POST = handle(async (req, ctx) => {
  const session = await requireSession();
  const { slug, levelKey } = await ctx.params;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError("Invalid submission", 400);
  const { seconds, ...payload } = parsed.data;

  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      levels: { where: { isActive: true }, orderBy: { order: "asc" }, include: { progress: { where: { userId: session.id } } } },
    },
  });
  if (!game) throw new ApiError("Game not found", 404);

  const level = game.levels.find((l) => l.key === levelKey);
  if (!level) throw new ApiError("Level not found", 404);

  // The game itself must be unlocked — its own criteria AND its world must be
  // reachable (mirrors the world-lock gate used by the catalog / world detail).
  const [user, ctxUnlock, worlds, worldProgressRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { level: true, xp: true } }),
    buildUnlockContext(session.id),
    prisma.world.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, unlockCriteria: true } }),
    prisma.userWorldProgress.findMany({ where: { userId: session.id }, select: { worldId: true } }),
  ]);
  const worldProgressIds = new Set(worldProgressRows.map((p) => p.worldId));
  const worldById = new Map(worlds.map((w) => [w.id, w]));
  const firstWorldId = worlds[0]?.id ?? null;
  const worldIsLocked =
    !!game.worldId &&
    game.worldId !== firstWorldId &&
    !worldProgressIds.has(game.worldId) &&
    !evaluateUnlock(worldById.get(game.worldId)?.unlockCriteria as never, ctxUnlock);
  const unlocked =
    (user?.level ?? 1) >= game.levelRequirement &&
    evaluateUnlock(game.unlockCriteria as never, ctxUnlock) &&
    !worldIsLocked;
  if (!unlocked) throw new ApiError("This game is still locked", 403);

  // Levels unlock sequentially within the game.
  const progressMap = new Map<string, { status: string; bestScore: number; attempts: number; completedAt: Date | null }>();
  for (const l of game.levels) for (const p of l.progress) progressMap.set(l.id, p);
  const levelState = levelStates(game.levels, progressMap, true).get(level.id);
  if (!levelState?.unlocked) throw new ApiError("Beat the previous level to play this one", 403);

  const result = await submitGameLevel(
    session.id,
    { id: game.id, key: game.key, name: game.name, slug: game.slug, kind: game.kind, worldId: game.worldId, isBoss: game.isBoss, rewardCoins: game.rewardCoins, certificateTitle: game.certificateTitle },
    { id: level.id, key: level.key, title: level.title, xpReward: level.xpReward, config: level.config },
    payload as unknown as GameSubmission,
    seconds
  );

  const userAfter = await prisma.user.findUnique({ where: { id: session.id }, select: { xp: true } });
  const levelAfter = levelFromXp(userAfter?.xp ?? 0).level;

  return {
    ...result,
    explanation: result.passed && !result.perfect ? level.explanation : null,
    levelUp: levelAfter > (user?.level ?? 1) ? levelAfter : null,
    boss: result.boss
      ? {
          certificate: result.boss.certificate,
          unlockedWorlds: result.boss.unlockedWorlds,
          mastered: result.boss.mastered,
          xpAwarded: result.boss.award.xpAwarded,
          coinsAwarded: result.boss.award.coinsAwarded,
        }
      : null,
  };
});
