import Link from "next/link";
import { Award, Check, ChevronRight, Lock, MapPin, Skull, Trophy } from "lucide-react";
import { WORLD_STATUS } from "@/lib/constants";
import type { WorldMapItem } from "@/lib/engine/worlds";
import { cn } from "@/lib/utils";

function MasteryBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  );
}

function RequirementList({ items }: { items: WorldMapItem["requirements"] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((r, i) => (
        <li key={i} className="flex items-start gap-2 text-xs">
          <span
            className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
              r.met ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            )}
          >
            {r.met ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <div>
            <p className={cn("font-medium", r.met ? "text-success" : "text-foreground/85")}>{r.label}</p>
            {r.detail && <p className="text-muted-foreground">{r.detail}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function WorldCard({ world }: { world: WorldMapItem }) {
  const locked = !world.unlocked;
  const mastered = world.mastered;
  const statusLabel = mastered ? "Mastered" : locked ? "Locked" : world.isCurrent ? "Your world" : "Available";

  const body = (
    <div
      className={cn(
        "relative rounded-2xl border bg-card p-5 transition",
        mastered ? "border-success/40 bg-success/5" : locked ? "border-border opacity-80" : "border-border hover:border-primary/50 hover:shadow-md"
      )}
      style={!mastered && !locked ? { borderColor: `${world.color}55` } : undefined}
    >
        {world.isCurrent && (
          <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            <MapPin className="h-3 w-3" /> CURRENT
          </span>
        )}

        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
              style={{ backgroundColor: `${world.color}1a` }}
              aria-hidden
            >
              {locked ? <Lock className="h-6 w-6 text-muted-foreground" /> : world.icon}
            </span>
            {mastered && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-foreground">
                <Trophy className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">World {world.order}</p>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{world.difficulty}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                  mastered ? "bg-success/15 text-success" : locked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                )}
              >
                {statusLabel}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-bold leading-tight">{world.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{world.description}</p>
          </div>

          {!locked && (
            <span className="hidden shrink-0 items-center text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary sm:flex">
              <ChevronRight className="h-5 w-5" />
            </span>
          )}
        </div>

        <div className="mt-4">
          {locked ? (
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to unlock</p>
              {world.requirements.length > 0 ? (
                <RequirementList items={world.requirements} />
              ) : (
                <p className="text-xs text-muted-foreground">Complete the previous world to unlock this one.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">World mastery</span>
                  <span className="font-bold" style={{ color: world.color }}>{world.masteryPercent}%</span>
                </div>
                <MasteryBar percent={world.masteryPercent} color={mastered ? "var(--success)" : world.color} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
                <span className="rounded-md bg-muted/60 px-2 py-1">📚 Lessons {world.progress.lessons.done}/{world.progress.lessons.total}</span>
                <span className="rounded-md bg-muted/60 px-2 py-1">🎮 Games {world.progress.games.done}/{world.progress.games.total}</span>
                <span className="rounded-md bg-muted/60 px-2 py-1">📝 Quizzes {world.progress.quizzes.done}/{world.progress.quizzes.total}</span>
                <span className="rounded-md bg-muted/60 px-2 py-1">🛠️ Projects {world.progress.projects.done}/{world.progress.projects.total}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                  <Skull className="h-3 w-3 text-warning" />
                  {world.bossDefeated ? "Boss defeated" : "Boss pending"}
                  {world.bossGame ? ` · ${world.bossGame.name}` : ""}
                </span>
                {world.certificateEarned && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                    <Award className="h-3 w-3" /> Certificate earned
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  );

  if (locked) {
    return <div className="group relative block">{body}</div>;
  }
  return (
    <Link href={`/worlds/${world.slug}`} className="group relative block">
      {body}
    </Link>
  );
}

export function WorldMap({ worlds }: { worlds: WorldMapItem[] }) {
  return (
    <div className="relative">
      <div className="absolute bottom-6 left-7 top-6 w-px bg-gradient-to-b from-primary/60 via-border to-border" aria-hidden />
      <div className="space-y-5">
        {worlds.map((w) => (
          <div key={w.id} className="relative pl-16">
            <span
              className={cn(
                "absolute left-0 top-6 z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 bg-card text-lg",
                w.mastered
                  ? "border-success text-success"
                  : w.unlocked
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
              )}
              style={w.unlocked && !w.mastered ? { borderColor: w.color, color: w.color } : undefined}
              aria-hidden
            >
              {w.mastered ? <Trophy className="h-6 w-6" /> : w.unlocked ? w.icon : <Lock className="h-5 w-5" />}
            </span>
            <WorldCard world={w} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function worldStatusLabel(status: string): string {
  switch (status) {
    case WORLD_STATUS.MASTERED:
      return "Mastered";
    case WORLD_STATUS.LOCKED:
      return "Locked";
    case WORLD_STATUS.ACTIVE:
      return "In progress";
    default:
      return "Unlocked";
  }
}
