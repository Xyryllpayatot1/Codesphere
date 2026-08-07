import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStudyPlan } from "@/lib/engine/recommendation";
import { loadDashboardData } from "@/lib/dashboard-data";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { todayKey, fromDateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const userId = session.id;
  const today = todayKey();

  const [todayPlanCount, activeEnrollments] = await Promise.all([
    prisma.studyPlanItem.count({ where: { userId, date: fromDateKey(today) } }),
    prisma.enrollment.count({ where: { userId, status: { not: "COMPLETED" }, course: { status: "PUBLISHED" } } }),
  ]);

  if (todayPlanCount === 0 && activeEnrollments > 0) {
    const settings = await prisma.userSetting.findUnique({ where: { userId } });
    await generateStudyPlan(userId, { availableMinutes: settings?.dailyGoalMinutes ?? 30, dateKey: today });
  }

  const data = await loadDashboardData(userId);
  return <DashboardView data={data} />;
}
