// ---------------------------------------------------------------------------
// Networking Lab server service — mission catalog with progress, mission
// submission (engine re-validation + rewards) and project persistence.
// ---------------------------------------------------------------------------

import "server-only";

import { prisma } from "@/lib/prisma";
import { ACTIVITY_TYPES, XP_TYPES } from "@/lib/constants";
import { awardXp } from "@/lib/engine/rewards";
import { NetworkSimulator } from "./sim";
import { NET_MISSIONS, getMission } from "./missions";
import type { SimSnapshot } from "./types";

// ------------------------------------------------------------------ catalog

export type NetMissionCatalogItem = {
  slug: string;
  order: number;
  title: string;
  short: string;
  difficulty: string;
  xp: number;
  coins: number;
  status: "IN_PROGRESS" | "COMPLETED";
  completedAt: Date | null;
};

export async function loadNetMissionCatalog(userId: string): Promise<{
  missions: NetMissionCatalogItem[];
  stats: { total: number; completed: number };
}> {
  const progress = await prisma.networkMissionProgress.findMany({ where: { userId } });
  const bySlug = new Map(progress.map((p) => [p.slug, p]));
  const missions = [...NET_MISSIONS]
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      slug: m.slug,
      order: m.order,
      title: m.title,
      short: m.short,
      difficulty: m.difficulty,
      xp: m.xp,
      coins: m.coins,
      status: bySlug.get(m.slug)?.status === "COMPLETED" ? ("COMPLETED" as const) : ("IN_PROGRESS" as const),
      completedAt: bySlug.get(m.slug)?.completedAt ?? null,
    }));
  return { missions, stats: { total: missions.length, completed: missions.filter((m) => m.status === "COMPLETED").length } };
}

// ---------------------------------------------------------------- submission

export type NetMissionSubmitResult = {
  passed: boolean;
  message: string;
  hints: string[];
  firstTime: boolean;
  xpAwarded: number;
  coinsAwarded: number;
  levelUp: number | null;
};

/** Re-validates the player's live network with the same pure engine the
 * browser uses, then rewards the mission once. */
export async function submitNetMission(userId: string, slug: string, snapshot: SimSnapshot): Promise<NetMissionSubmitResult> {
  const mission = getMission(slug);
  if (!mission) throw new Error("Mission not found");

  const sim = new NetworkSimulator(snapshot);
  const result = mission.verify(sim);
  if (!result.ok) {
    return { passed: false, message: result.message, hints: result.hints, firstTime: false, xpAwarded: 0, coinsAwarded: 0, levelUp: null };
  }

  // Ensure a progress row exists so the atomic claim below can match it.
  await prisma.networkMissionProgress.upsert({
    where: { userId_slug: { userId, slug } },
    create: { userId, slug, status: "IN_PROGRESS" },
    update: {},
  });

  // Atomically claim the first completion. If two submissions race, only one
  // updateMany matches a non-completed row, so the mission is never rewarded twice.
  const claimed = await prisma.networkMissionProgress.updateMany({
    where: { userId, slug, status: { not: "COMPLETED" } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  const firstTime = claimed.count > 0;

  let xpAwarded = 0;
  let coinsAwarded = 0;
  if (firstTime) {
    const before = await prisma.user.findUnique({ where: { id: userId }, select: { level: true } });
    await prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.NET_MISSION_COMPLETED, data: { mission: slug, title: mission.title } },
    });
    const award = await awardXp(userId, {
      amount: mission.xp,
      coins: mission.coins,
      type: XP_TYPES.NET_MISSION,
      reason: `Networking mission: ${mission.title}`,
      data: { mission: slug },
      skipMissionProgress: true,
    });
    xpAwarded = award.xpAwarded;
    coinsAwarded = award.coinsAwarded;
    return { passed: true, message: result.message, hints: [], firstTime, xpAwarded, coinsAwarded, levelUp: award.level > (before?.level ?? 1) ? award.level : null };
  }

  return { passed: true, message: result.message, hints: [], firstTime: false, xpAwarded: 0, coinsAwarded: 0, levelUp: null };
}

// --------------------------------------------------------------- projects

export type NetProjectSummary = {
  id: string;
  title: string;
  missionSlug: string | null;
  isArchived: boolean;
  updatedAt: Date;
  devices: number;
  cables: number;
};

function snapshotCounts(snapshot: unknown): { devices: number; cables: number } {
  if (!snapshot || typeof snapshot !== "object") return { devices: 0, cables: 0 };
  const o = snapshot as { devices?: unknown; cables?: unknown };
  return {
    devices: Array.isArray(o.devices) ? o.devices.length : 0,
    cables: Array.isArray(o.cables) ? o.cables.length : 0,
  };
}

export async function listNetProjects(userId: string): Promise<NetProjectSummary[]> {
  // Bounded listing — each row carries a full topology snapshot, so an
  // unbounded findMany would pull megabytes of JSON for large libraries.
  const rows = await prisma.networkProject.findMany({
    where: { userId, isArchived: false },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return rows.map((p) => ({ id: p.id, title: p.title, missionSlug: p.missionSlug, isArchived: p.isArchived, updatedAt: p.updatedAt, ...snapshotCounts(p.snapshot) }));
}

export async function getNetProject(userId: string, id: string) {
  const p = await prisma.networkProject.findUnique({ where: { id } });
  if (!p || p.userId !== userId) return null;
  return p;
}

export async function createNetProject(userId: string, input: { title: string; snapshot: unknown; missionSlug?: string | null }) {
  return prisma.networkProject.create({
    data: { userId, title: input.title, snapshot: input.snapshot as never, missionSlug: input.missionSlug ?? null },
  });
}

export async function updateNetProject(userId: string, id: string, patch: { title?: string; snapshot?: unknown; isArchived?: boolean }) {
  const existing = await prisma.networkProject.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return null;
  return prisma.networkProject.update({
    where: { id },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.snapshot !== undefined ? { snapshot: patch.snapshot as never } : {}),
      ...(patch.isArchived !== undefined ? { isArchived: patch.isArchived } : {}),
    },
  });
}

export async function deleteNetProject(userId: string, id: string) {
  const existing = await prisma.networkProject.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;
  await prisma.networkProject.delete({ where: { id } });
  return true;
}
