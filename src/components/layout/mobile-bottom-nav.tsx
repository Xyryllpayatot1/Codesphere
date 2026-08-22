"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Network, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  match: (pathname: string) => boolean;
};

const ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    match: (p) =>
      p === "/dashboard" ||
      p === "/" ||
      p.startsWith("/achievements") ||
      p.startsWith("/certificates") ||
      p.startsWith("/worlds") ||
      p.startsWith("/admin") ||
      p.startsWith("/study-plan") ||
      p.startsWith("/whats-new"),
  },
  {
    href: "/learn",
    label: "Learn",
    icon: BookOpen,
    match: (p) => p.startsWith("/learn") || p.startsWith("/courses") || p.startsWith("/games") || p.startsWith("/projects"),
  },
  {
    href: "/networking",
    label: "Lab",
    icon: Network,
    match: (p) => p.startsWith("/networking") || p.startsWith("/room/"),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: TrendingUp,
    match: (p) => p.startsWith("/progress"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    match: (p) => p.startsWith("/profile"),
  },
];

/**
 * App-like primary navigation shown below the desktop `lg` breakpoint.
 * Fixed to the bottom edge, respects safe-area insets, never covers content
 * (the shell reserves space for it).
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 backdrop-blur-xl lg:hidden"
    >
      <div className="pb-safe mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[3.25rem] min-w-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 pb-1 pt-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" aria-hidden />
              )}
              <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
              <span className={cn("text-2xs leading-none", active ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
