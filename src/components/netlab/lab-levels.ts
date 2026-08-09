import type { DeviceType } from "@/lib/net/types";

export type LabLevel = "beginner" | "intermediate" | "advanced" | "sandbox";

export const LAB_LEVELS: { id: LabLevel; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner", hint: "Core devices only — learn one thing at a time." },
  { id: "intermediate", label: "Intermediate", hint: "Routers and access points join the party." },
  { id: "advanced", label: "Advanced", hint: "Full toolkit — firewalls, clouds and wireless routing." },
  { id: "sandbox", label: "Sandbox", hint: "Everything unlocked, no objectives, no XP." },
];

export const LAB_LEVEL_ORDER: LabLevel[] = LAB_LEVELS.map((l) => l.id);

export type MissionDifficulty = "beginner" | "intermediate" | "advanced";

export const MISSION_LEVELS: Record<MissionDifficulty, LabLevel> = {
  beginner: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
};

/** Is a mission with this difficulty offered at the given level? */
export function missionOfferedAt(level: LabLevel, difficulty: MissionDifficulty): boolean {
  if (level === "sandbox") return false;
  const index = LAB_LEVEL_ORDER.indexOf(level);
  const target = LAB_LEVEL_ORDER.indexOf(MISSION_LEVELS[difficulty]);
  return target >= 0 && target <= index;
}

const DEVICE_TIER: Record<DeviceType, number> = {
  pc: 1,
  laptop: 1,
  server: 1,
  printer: 1,
  switch: 1,
  hub: 1,
  router: 2,
  accessPoint: 2,
  wirelessRouter: 3,
  firewall: 3,
  cloud: 4,
};

/** Devices offered at a level. Sandbox and Advanced see everything. */
export function devicesAtLevel(level: LabLevel, all: DeviceType[]): DeviceType[] {
  if (level === "sandbox" || level === "advanced") return all;
  const maxTier = level === "beginner" ? 1 : 2;
  return all.filter((t) => (DEVICE_TIER[t] ?? 1) <= maxTier);
}
