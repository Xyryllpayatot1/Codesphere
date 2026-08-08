"use client";

import { useState } from "react";
import { Sidebar, type ShellUser } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <Sidebar user={user} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-h-dvh flex-col lg:pl-64">
        <Header user={user} onMenuClick={() => setOpen(true)} />
        <main className="flex-1 px-4 pb-20 pt-6 lg:px-8 lg:pb-6">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
