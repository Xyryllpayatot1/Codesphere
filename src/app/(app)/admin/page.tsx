import Link from "next/link";
import { Shield, Users, BookOpen, Rocket, Clock, Map as MapIcon, Sparkles } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmissionReview } from "@/components/admin/submission-review";
import { AdminWorldManager, type AdminWorld } from "@/components/admin/world-manager";
import { ReleaseManager } from "@/components/admin/release-manager";
import { listReleasesForAdmin } from "@/lib/services/releases";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole(ROLES.ADMIN);

  const [counts, pending, recentUsers] = await Promise.all([
    Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.project.count(),
      prisma.projectSubmission.count({ where: { status: "SUBMITTED" } }),
    ]),
    prisma.projectSubmission.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      take: 20,
      include: {
        user: { select: { name: true, username: true } },
        project: { select: { title: true, slug: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, username: true, email: true, role: true, xp: true, createdAt: true },
    }),
  ]);

  const [worlds, worldGames] = await Promise.all([
    prisma.world.findMany({ orderBy: { order: "asc" } }),
    prisma.game.findMany({ where: { worldId: { not: null } }, select: { id: true, key: true, name: true, isBoss: true, worldId: true } }),
  ]);

  const releases = await listReleasesForAdmin();

  const gamesByWorld = new Map<string, { id: string; key: string; name: string }[]>();
  for (const g of worldGames) {
    if (!g.worldId) continue;
    const list = gamesByWorld.get(g.worldId) ?? [];
    list.push({ id: g.id, key: g.key, name: g.name });
    gamesByWorld.set(g.worldId, list);
  }
  const bossIds = new Set(worldGames.filter((g) => g.isBoss).map((g) => g.id));

  const adminWorlds: AdminWorld[] = worlds.map((w) => {
    const games = gamesByWorld.get(w.id) ?? [];
    return {
      id: w.id,
      key: w.key,
      slug: w.slug,
      name: w.name,
      description: w.description,
      icon: w.icon,
      color: w.color,
      difficulty: w.difficulty,
      order: w.order,
      rewardXp: w.rewardXp,
      rewardCoins: w.rewardCoins,
      isActive: w.isActive,
      courseSlugs: Array.isArray(w.courseSlugs) ? (w.courseSlugs as string[]) : [],
      unlockCriteria: (w.unlockCriteria as Record<string, unknown> | null) ?? null,
      masteryConfig: (w.masteryConfig as Record<string, unknown> | null) ?? null,
      gamesCount: games.length,
      bossGame: games.find((g) => bossIds.has(g.id)) ?? null,
    };
  });

  const [users, courses, projects, submissions] = counts;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Shield className="h-6 w-6 text-primary" /> Admin panel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform overview and project reviews.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Users, label: "Users", value: users },
          { icon: BookOpen, label: "Courses", value: courses },
          { icon: Rocket, label: "Projects", value: projects },
          { icon: Clock, label: "Pending reviews", value: submissions },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project submissions to review</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">All caught up — nothing waiting for review.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/projects/${s.project.slug}`} className="text-sm font-medium hover:text-primary">
                      {s.project.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      by {s.user.name} (@{s.user.username}) ·{" "}
                      {s.submittedAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <SubmissionReview id={s.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapIcon className="h-4 w-4 text-primary" /> Programming worlds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminWorldManager worlds={adminWorlds} gamesByWorld={Object.fromEntries(gamesByWorld)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Update notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReleaseManager releases={releases} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Newest users</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                  {u.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant={u.role === ROLES.ADMIN ? "accent" : "outline"}>{u.role.toLowerCase()}</Badge>
                <span className="text-xs text-muted-foreground">{u.xp.toLocaleString()} XP</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
