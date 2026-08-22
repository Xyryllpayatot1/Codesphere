"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  CalendarClock,
  Gamepad2,
  Map,
  Rocket,
  Trophy,
  Award,
  Shield,
  Network,
  TrendingUp,
  X,
  Newspaper,
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

type NavItem = { href: string; label: string; icon: React.ElementType };

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Learn",
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/learn", label: "Courses", icon: BookOpen },
      { href: "/study-plan", label: "Study Plan", icon: CalendarClock },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/networking", label: "Networking Lab", icon: Network },
      { href: "/projects", label: "Projects", icon: Rocket },
      { href: "/games", label: "Games", icon: Gamepad2 },
      { href: "/worlds", label: "Worlds", icon: Map },
    ],
  },
  {
    label: "Track",
    items: [
      { href: "/progress", label: "Progress", icon: TrendingUp },
      { href: "/achievements", label: "Achievements", icon: Trophy },
      { href: "/certificates", label: "Certificates", icon: Award },
    ],
  },
];

const platformNav: NavItem[] = [{ href: "/whats-new", label: "What's New", icon: Newspaper }];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-[0.4375rem] text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-card transition-transform duration-200 ease-out lg:translate-x-0 lg:bg-background",
          open ? "translate-x-0" : "-translate-x-full lg:w-60"
        )}
        aria-label="Primary"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" onClick={onClose} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
            <Logo />
          </Link>
          <button
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground/80">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onClose} />
                ))}
              </div>
            </div>
          ))}

          <div className="mb-1.5 px-2.5 pt-1">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground/80">
              Platform
            </p>
          </div>
          <div className="space-y-0.5">
            {platformNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onClose} />
            ))}
            {isAdmin && (
              <NavLink
                item={{ href: "/admin", label: "Admin", icon: Shield }}
                pathname={pathname}
                onNavigate={onClose}
              />
            )}
          </div>
        </nav>

        <div className="border-t border-border p-3">
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                Lv {user.level} · @{user.username}
              </p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
