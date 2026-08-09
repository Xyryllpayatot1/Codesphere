"use client";

import {
  BookOpen,
  Code2,
  Compass,
  Database,
  Flame,
  Gamepad2,
  Globe,
  GraduationCap,
  Leaf,
  Network,
  Rocket,
  Sprout,
  Target,
  Trees,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  bookopen: BookOpen,
  code2: Code2,
  compass: Compass,
  database: Database,
  flame: Flame,
  gamepad2: Gamepad2,
  globe: Globe,
  graduationcap: GraduationCap,
  leaf: Leaf,
  network: Network,
  rocket: Rocket,
  sprout: Sprout,
  target: Target,
  trees: Trees,
  zap: Zap,
};

/** Renders a lucide icon from its lowercase name (stable across server/client components). */
export function FeatureIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name.toLowerCase()] ?? BookOpen;
  return <Icon className={className} aria-hidden />;
}
