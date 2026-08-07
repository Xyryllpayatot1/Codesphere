import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelFromXp } from "@/lib/engine/xp";
import { AppShell } from "@/components/layout/app-shell";
import type { ShellUser } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, username: true, email: true, role: true, xp: true, streak: true, avatarUrl: true },
  });

  if (!user) redirect("/login");

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
