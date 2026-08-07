import Link from "next/link";
import { Award, BookOpenCheck, BrainCircuit, CheckCircle2, Flame, FolderCheck, GraduationCap, XCircle, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { activityMessage } from "@/components/dashboard/activity-message";
import { type DashboardData } from "@/lib/dashboard-data";

const ICONS: Record<string, { icon: typeof Zap; className: string }> = {
  [ACTIVITY_TYPES.LESSON_COMPLETED]: { icon: CheckCircle2, className: "bg-primary/10 text-primary" },
  [ACTIVITY_TYPES.EXERCISE_COMPLETED]: { icon: BookOpenCheck, className: "bg-primary/10 text-primary" },
  [ACTIVITY_TYPES.QUIZ_PASSED]: { icon: BrainCircuit, className: "bg-primary/10 text-primary" },
  [ACTIVITY_TYPES.QUIZ_FAILED]: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
  [ACTIVITY_TYPES.ACHIEVEMENT_EARNED]: { icon: Award, className: "bg-amber-500/10 text-amber-600" },
  [ACTIVITY_TYPES.STREAK_MILESTONE]: { icon: Flame, className: "bg-orange-500/10 text-orange-600" },
  [ACTIVITY_TYPES.PROJECT_SUBMITTED]: { icon: FolderCheck, className: "bg-indigo-500/10 text-indigo-600" },
  [ACTIVITY_TYPES.PROJECT_APPROVED]: { icon: FolderCheck, className: "bg-emerald-500/10 text-emerald-600" },
  [ACTIVITY_TYPES.CERTIFICATE_EARNED]: { icon: GraduationCap, className: "bg-emerald-500/10 text-emerald-600" },
  [ACTIVITY_TYPES.COURSE_COMPLETED]: { icon: GraduationCap, className: "bg-emerald-500/10 text-emerald-600" },
};

export function ActivityFeed({ activities }: { activities: DashboardData["activities"] }) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Your latest milestones and actions will show up here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {activities.map((a) => {
            const { title, href } = activityMessage(a);
            const style = ICONS[a.type] ?? { icon: Zap, className: "bg-muted text-muted-foreground" };
            const Icon = style.icon;
            const body = (
              <span className="text-sm">{title}</span>
            );
            return (
              <li key={a.id} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.className}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  {href ? (
                    <Link href={href} className="font-medium hover:text-primary">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                  <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
