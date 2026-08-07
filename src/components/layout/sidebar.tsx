"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  CalendarClock,
  Terminal,
  Gamepad2,
  Map,
  Rocket,
  Trophy,
  Target,
  Store,
  Award,
  Medal,
  User,
  Shield,
  X,
  Sparkles,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { ROLES } from "@/lib/constants";

export type ShellUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  streak: number;
  avatarUrl?: string | null;
};

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/study-plan", label: "Study Plan", icon: CalendarClock },
  { href: "/playground", label: "Playground", icon: Terminal },
  { href: "/prompts", label: "Prompt Studio", icon: Sparkles },
  { href: "/worlds", label: "Worlds", icon: Map },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/networking", label: "Networking", icon: Network },
  { href: "/missions", label: "Missions", icon: Target },
  { href: "/projects", label: "Projects", icon: Rocket },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/store", label: "Store", icon: Store },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar({
  user,
  open,
  onClose,
}: {
  user: ShellUser;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isAdmin = user.role === ROLES.ADMIN;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:translate-x-0 lg:bg-background/60 lg:backdrop-blur",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/dashboard" onClick={onClose}>
            <Logo />
          </Link>
          <button
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {mainNav.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-2 h-px bg-border" />
              <Link
                href="/admin"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-border p-3">
          <Link href="/profile" onClick={onClose}>
            <div className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-secondary">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
