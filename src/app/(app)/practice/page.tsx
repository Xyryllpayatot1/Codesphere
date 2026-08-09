import Link from "next/link";
import { ArrowRight, Code2, Dumbbell, Gamepad2, ListChecks, Network, Play, Sparkles, Terminal } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadGameCatalog } from "@/lib/games/progress";
import { loadTodaysMissions } from "@/lib/engine/missions";
import { GameCard } from "@/components/games/game-card";
import { MissionsClient } from "@/components/missions/missions-client";

export const dynamic = "force-dynamic";

const MODES = [
  {
    href: "/playground",
    title: "Free Code Playground",
    description: "A blank canvas to experiment with HTML, CSS and JavaScript. No setup, no limits.",
    icon: Terminal,
    color: "#6366f1",
  },
  {
    href: "/networking",
    title: "Networking Lab",
    description: "Drag devices, wire them up and trace packets through networks you build.",
    icon: Network,
    color: "#06b6d4",
  },
  {
    href: "/prompts",
    title: "Prompt Studio",
    description: "Practice writing clear instructions for AI — a skill that saves you real time.",
    icon: Sparkles,
    color: "#f59e0b",
  },
];

export default async function PracticePage() {
  const session = await requireSession();
  const [user, { games }, missions] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { xp: true, level: true, coins: true } }),
    loadGameCatalog(session.id),
    loadTodaysMissions(session.id),
  ]);

  const view = missions.map((m) => ({
    key: m.key,
    title: m.title,
    description: m.description,
    type: m.type,
    target: m.target,
    progress: m.progress,
    rewardCoins: m.rewardCoins,
    rewardXp: m.rewardXp,
    claimed: m.claimed,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Dumbbell className="h-6 w-6 text-primary" /> Practice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Learning sticks when you do. Drill with games, take on daily missions, or experiment in a free sandbox.
        </p>
      </div>

      <section aria-label="Practice modes">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Play className="h-4 w-4 text-primary" /> Pick a mode
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {MODES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-secondary"
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${m.color}1a`, color: m.color }}
              >
                <m.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-semibold leading-snug">{m.title}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{m.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Open <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {games.length > 0 && (
        <section aria-label="Learning games">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Gamepad2 className="h-4 w-4 text-primary" /> Learning games
            </h2>
            <Link href="/games" className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.slice(0, 6).map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
        </section>
      )}

      <section aria-label="Daily missions">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <ListChecks className="h-4 w-4 text-primary" /> Today&apos;s missions
          </h2>
          <Link href="/missions" className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
            All missions <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <MissionsClient missions={view} unlocked={(user?.level ?? 1) >= 1} coins={user?.coins ?? 0} level={user?.level ?? 1} />
      </section>

      <section aria-label="Course exercises">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Code2 className="h-4 w-4 text-primary" /> Exercises inside courses
          </h2>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm font-medium">Every lesson packs hands-on exercises and quizzes</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Open any course in Learn and type real code — exercises are checked instantly, so you learn by doing.
          </p>
          <Link
            href="/learn"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Go to Learn <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
