"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Bell, Zap, Flame, ChevronDown, LogOut, User as UserIcon, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { cn, timeAgo } from "@/lib/utils";
import type { ShellUser } from "@/components/layout/sidebar";
import { SearchDialog } from "@/components/layout/search-dialog";

type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export function Header({ user, onMenuClick }: { user: ShellUser; onMenuClick: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return [] as NotificationItem[];
      const json = await res.json();
      return (json.data?.items ?? []) as NotificationItem[];
    },
    refetchInterval: 60_000,
  });

  const unread = notifications?.filter((n) => !n.isRead).length ?? 0;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function markRead() {
    await fetch("/api/notifications/read", { method: "POST" });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur sm:gap-3 sm:px-4 lg:px-6">
      <button
        className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <SearchDialog />

      <span
        className="hidden items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning-foreground tabular-nums dark:text-warning sm:inline-flex"
        title={`${user.streak}-day study streak`}
      >
        <Flame className="h-3.5 w-3.5" />
        {user.streak}
      </span>
      <span
        className="hidden items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary tabular-nums sm:inline-flex"
        title={`${user.xp.toLocaleString()} XP total`}
      >
        <Zap className="h-3.5 w-3.5" />
        Lv {user.level}
      </span>

      <ThemeToggle className="hidden sm:inline-flex" />

      <div className="relative" ref={notifRef}>
        <button
          className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            setNotifOpen((o) => !o);
            setMenuOpen(false);
          }}
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          aria-expanded={notifOpen}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {notifOpen && (
          <div
            className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-popover p-2 shadow-lg"
            onClick={markRead}
            role="region"
            aria-label="Notifications"
          >
            <p className="px-2 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
              Notifications
            </p>
            <div className="max-h-80 overflow-y-auto">
              {notifications && notifications.length > 0 ? (
                notifications.slice(0, 8).map((n) => (
                  <div
                    key={n.id}
                    className={cn("rounded-lg px-2 py-2 hover:bg-secondary", !n.isRead && "bg-primary/5")}
                  >
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-2xs text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          className="flex items-center gap-1.5 rounded-full p-1 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            setMenuOpen((o) => !o);
            setNotifOpen(false);
          }}
          aria-label="Account menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <Avatar src={user.avatarUrl} alt={user.name} size="md" />
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-popover p-1.5 shadow-lg"
            role="menu"
          >
            <div className="border-b border-border px-3 py-2">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">@{user.username}</p>
            </div>
            <div className="pt-1.5">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
              >
                <UserIcon className="h-4 w-4" /> Profile
              </Link>
              <Link
                href="/profile?tab=settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button
                onClick={handleLogout}
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
