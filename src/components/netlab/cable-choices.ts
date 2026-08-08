import type { CableType } from "@/lib/net/types";

/** Shared cable-type choices — the single source of truth for both the
 * desktop CableChooser dropdown and the mobile cable-type selector. */
export const CABLE_CHOICES: { type: CableType; scene: string; tech: string }[] = [
  { type: "copperStraight", scene: "Computer ↔ Switch", tech: "Straight-Through Cable" },
  { type: "copperCrossover", scene: "Switch ↔ Switch", tech: "Crossover Cable" },
  { type: "console", scene: "PC ↔ Router/Switch CLI", tech: "Console Cable" },
  { type: "serial", scene: "Router ↔ Router (WAN)", tech: "Serial Cable" },
  { type: "fiber", scene: "Fast backbone link", tech: "Fiber Cable" },
];
