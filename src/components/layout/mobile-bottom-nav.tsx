"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Code2, Network, User } from "lucide-react";
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
      p.startsWith("/store") ||
      p.startsWith("/leaderboard") ||
      p.startsWith("/certificates") ||
      p.startsWith("/worlds") ||
      p.startsWith("/admin") ||
      p.startsWith("/study-plan") ||
      p.startsWith("/progress"),
  },
  {
    href: "/learn",
    label: "Learn",
    icon: BookOpen,
    match: (p) => p.startsWith("/learn") || p.startsWith("/courses"),
  },
  {
    href: "/practice",
    label: "Practice",
    icon: Code2,
    match: (p) => p.startsWith("/practice") || p.startsWith("/playground") || p.startsWith("/games") || p.startsWith("/missions") || p.startsWith("/projects") || p.startsWith("/prompts"),
  },
  {
    href: "/networking",
    label: "Lab",
    icon: Network,
    match: (p) => p.startsWith("/networking"),
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden"
    >
      <div className="pb-safe mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1.5">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 min-w-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 pb-1 pt-1.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" aria-hidden />
              )}
              <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
              <span className={cn("text-[10px] leading-none", active ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
