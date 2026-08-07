import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, BookOpen, ChevronRight, Gamepad2, Lock, MapPin, Skull, Trophy } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { loadWorldDetail } from "@/lib/engine/worlds";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WorldDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireSession();
  const { slug } = await params;
  const data = await loadWorldDetail(session.id, slug);
  if (!data) notFound();

  const { world, nextWorld, boss, games, courses, quizBest, certificates } = data;
  const mastered = world.mastered;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/worlds" className="font-medium hover:text-foreground">Worlds</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-semibold text-foreground">{world.name}</span>
      </div>

      <div
        className="flex flex-col gap-4 rounded-2xl border p-6"
        style={{ borderColor: mastered ? "var(--success)" : world.color, backgroundColor: `${world.color}0d` }}
      >
        <div className="flex items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl" style={{ backgroundColor: `${world.color}1a` }} aria-hidden>
            {world.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">World {world.order}</p>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{world.difficulty}</span>
              {world.isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  <MapPin className="h-3 w-3" /> Current world
                </span>
              )}
              {mastered && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                  <Trophy className="h-3 w-3" /> Mastered
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{world.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{world.description}</p>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold">World mastery</span>
            <span className="font-bold" style={{ color: world.color }}>{world.masteryPercent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-background/60">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${world.masteryPercent}%`, backgroundColor: mastered ? "var(--success)" : world.color }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Mastery builds from lessons, games, quizzes, projects and daily practice. Reach 80% and defeat the boss to master the world.
          </p>
        </div>

        {!world.unlocked && (
          <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="font-semibold text-foreground">This world is still locked</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {world.requirements.length === 0 ? (
                  <li>Complete the previous world to unlock this one.</li>
                ) : (
                  world.requirements.map((r, i) => (
                    <li key={i} className={cn(r.met ? "text-success" : "")}>{r.met ? "✓" : "•"} {r.label}{r.detail ? ` — ${r.detail}` : ""}</li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {boss && (
        <div className="flex flex-col gap-4 rounded-2xl border border-warning/40 bg-warning/5 p-5 sm:flex-row sm:items-center">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-3xl" aria-hidden>
            <Skull className="h-7 w-7 text-warning" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-warning">
              <Skull className="h-3.5 w-3.5" /> World boss
            </p>
            <h2 className="mt-0.5 text-lg font-bold">{boss.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{boss.description}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {boss.levelsBeaten}/{boss.levelsTotal} levels beaten · +{boss.xpReward} XP per level · 🪙{boss.rewardCoins} first-beat bonus
            </p>
          </div>
          {world.unlocked ? (
            <Link
              href={`/games/${boss.slug}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-warning px-4 py-2 text-sm font-bold text-warning-foreground transition hover:opacity-90"
            >
              <Skull className="h-4 w-4" /> {world.bossDefeated ? "Replay boss" : "Fight the boss"}
            </Link>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-bold text-muted-foreground">
              <Lock className="h-4 w-4" /> Locked
            </span>
          )}
        </div>
      )}

      {world.bossDefeated && (
        <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/5 p-4 text-sm font-semibold text-success">
          <Trophy className="h-5 w-5" /> Boss defeated!
          {mastered ? " World mastered — certificate earned." : " Keep building mastery to fully master this world."}
        </div>
      )}

      {certificates.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Award className="h-4 w-4" /> World certificate
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {certificates.map((c) => (
              <div key={c.code} className="rounded-lg border border-primary/30 bg-card px-4 py-3">
                <p className="text-sm font-bold">{c.title}</p>
                <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {courses.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-4 w-4" /> Courses
          </p>
          <div className="space-y-2">
            {courses.map((c) => {
              const pct = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
              return (
                <Link key={c.slug} href={`/learn/${c.slug}`} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5 transition hover:border-primary/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.completed}/{c.total} lessons</p>
                  </div>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs font-bold text-muted-foreground">{pct}%</span>
                </Link>
              );
            })}
          </div>
          {quizBest > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">Best world quiz score: <span className="font-semibold text-foreground">{quizBest}%</span></p>
          )}
        </div>
      )}

      {games.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Gamepad2 className="h-4 w-4" /> Games
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {games.map((g) => {
              const pct = g.progress.total > 0 ? Math.round((g.progress.beaten / g.progress.total) * 100) : 0;
              return (
                <Link key={g.slug} href={g.unlocked ? `/games/${g.slug}` : "#"} className={cn("rounded-lg border border-border bg-background/40 px-3 py-3 transition", g.unlocked && "hover:border-primary/50")}>
                  <div className="flex items-center gap-2">
                    <span aria-hidden>{g.icon}</span>
                    <span className="truncate text-sm font-semibold">{g.name}</span>
                    {g.isBoss && <Skull className="h-3.5 w-3.5 shrink-0 text-warning" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{g.progress.beaten}/{g.progress.total} levels · {pct}%</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {nextWorld && (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm">
          <span className="text-muted-foreground">
            Next up: <span className="font-semibold text-foreground">{nextWorld.icon} {nextWorld.name}</span>
            {!nextWorld.unlocked ? " — master this world to unlock it." : ""}
          </span>
          {nextWorld.unlocked && (
            <Link href={`/worlds/${nextWorld.slug}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              Enter <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
