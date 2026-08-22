import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStudyPlan } from "@/lib/engine/recommendation";
import { loadDashboardData } from "@/lib/dashboard-data";
import { makePerf } from "@/lib/perf";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { todayKey, fromDateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

type LabProjectCard = {
  id: string;
  title: string;
  missionSlug: string | null;
  updatedAt: Date;
  deviceCount: number;
};

export default async function DashboardPage() {
  const perf = makePerf("dashboard");
  const session = await requireSession();
  perf("session");
  const userId = session.id;
  const today = todayKey();

  const [todayPlanCount, activeEnrollments] = await Promise.all([
    prisma.studyPlanItem.count({ where: { userId, date: fromDateKey(today) } }),
    prisma.enrollment.count({ where: { userId, status: { not: "COMPLETED" }, course: { status: "PUBLISHED" } } }),
  ]);
  perf("plan/enrollment counts");

  if (todayPlanCount === 0 && activeEnrollments > 0) {
    const settings = await prisma.userSetting.findUnique({ where: { userId }, select: { dailyGoalMinutes: true } });
    await generateStudyPlan(userId, { availableMinutes: settings?.dailyGoalMinutes ?? 30, dateKey: today });
    perf("generateStudyPlan");
  }

  // Snapshot JSON blobs are never sent to the client — only a device count,
  // computed here on the server.
  const projectRows = await prisma.networkProject.findMany({
    where: { userId, isArchived: false },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { id: true, title: true, missionSlug: true, updatedAt: true, snapshot: true },
  });
  const recentProjects: LabProjectCard[] = projectRows.map((p) => {
    const snapshot = p.snapshot as { devices?: unknown[] } | null;
    return {
      id: p.id,
      title: p.title,
      missionSlug: p.missionSlug,
      updatedAt: p.updatedAt,
      deviceCount: Array.isArray(snapshot?.devices) ? snapshot!.devices!.length : 0,
    };
  });
  perf("recent projects");

  const data = await loadDashboardData(userId);
  perf("dashboard data");

  return <DashboardView data={data} recentProjects={recentProjects} />;
}
