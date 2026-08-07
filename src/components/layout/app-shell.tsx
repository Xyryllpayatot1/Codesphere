"use client";

import { useState } from "react";
import { Sidebar, type ShellUser } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar user={user} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header user={user} onMenuClick={() => setOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
