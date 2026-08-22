"use client";

// ---------------------------------------------------------------------------
// CreyvaPH
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CreyvaPH
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Sidebar, type ShellUser } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <Sidebar user={user} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-h-dvh flex-col lg:pl-60">
        <Header user={user} onMenuClick={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
        <div className="pb-[4.25rem] lg:pb-0">
          <Footer />
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
