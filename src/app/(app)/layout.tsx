// ---------------------------------------------------------------------------
// CodeSphere
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CodeSphere
// ---------------------------------------------------------------------------

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelFromXp } from "@/lib/engine/xp";
import { AppShell } from "@/components/layout/app-shell";
import type { ShellUser } from "@/components/layout/sidebar";
import { ROLES } from "@/lib/constants";

// Server-rendered per request (DB-backed) — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      xp: true,
      streak: true,
      avatarUrl: true,
      settings: { select: { onboardedAt: true } },
    },
  });

  if (!user) redirect("/login");

  // New students pick a learning path on /onboarding before using the app.
  if (user.role !== ROLES.ADMIN && !user.settings?.onboardedAt) {
    redirect("/onboarding");
  }

  const shellUser: ShellUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    xp: user.xp,
    level: levelFromXp(user.xp).level,
    streak: user.streak,
    avatarUrl: user.avatarUrl,
  };

  return <AppShell user={shellUser}>{children}</AppShell>;
}
