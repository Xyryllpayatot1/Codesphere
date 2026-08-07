import { Zap, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { levelTitle } from "@/lib/engine/xp";

export function XpBadge({ xp, level, streak, className }: { xp: number; level: number; streak: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground" title={`Level ${level} · ${levelTitle(level)}`}>
        <Zap className="h-3.5 w-3.5 text-accent-foreground" />
        Lv {level}
        <span className="font-normal text-accent-foreground/70">· {xp.toLocaleString()} XP</span>
      </span>
      {streak > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-500" title="Day streak">
          <Flame className="h-3.5 w-3.5" />
          {streak}
        </span>
      )}
    </div>
  );
}

export function DifficultyPill({ difficulty }: { difficulty: string }) {
  const styles: Record<string, string> = {
    BEGINNER: "bg-success/15 text-success",
    INTERMEDIATE: "bg-warning/15 text-warning dark:text-warning",
    ADVANCED: "bg-destructive/15 text-destructive",
  };
  const labels: Record<string, string> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", styles[difficulty])}>
      {labels[difficulty] ?? difficulty}
    </span>
  );
}
