"use client";

import { useIsMobile } from "@/lib/mobile";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { MobileDashboardView, type NetProjectRow } from "@/components/dashboard/mobile-dashboard";
import type { DashboardData } from "@/lib/dashboard-data";

/** Renders the compact mobile dashboard or the full desktop dashboard. */
export function DashboardShell({
  data,
  recentProjects,
  recentLessons,
}: {
  data: DashboardData;
  recentProjects: NetProjectRow[];
  recentLessons: DashboardData["activities"];
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileDashboardView data={data} recentProjects={recentProjects} recentLessons={recentLessons} />;
  }
  return <DashboardView data={data} />;
}
