import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-success/10 text-success",
  SUBMITTED: "bg-amber-500/10 text-amber-600",
  REJECTED: "bg-destructive/10 text-destructive",
};

export default async function ProjectsPage() {
  const session = await requireSession();
  const userId = session.id;

  const projects = await prisma.project.findMany({
    where: { isPublished: true },
    orderBy: [{ course: { order: "asc" } }, { order: "asc" }],
    include: {
      course: { select: { title: true, slug: true, color: true } },
      submissions: {
        where: { userId },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });

  const approved = projects.filter((p) => p.submissions[0]?.status === "APPROVED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Rocket className="h-6 w-6 text-primary" /> Projects
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build real things. {approved} of {projects.length} approved.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const status = p.submissions[0]?.status;
          return (
            <Link key={p.id} href={`/projects/${p.slug}`} className="group">
              <Card className="h-full transition group-hover:border-primary/40">
                <CardContent className="flex h-full flex-col pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                      style={{ backgroundColor: `${p.course.color}1a`, color: p.course.color }}
                      aria-hidden
                    >
                      {p.course.title.slice(0, 1)}
                    </span>
                    {status ? (
                      <Badge className={cn("text-[10px]", STATUS_STYLES[status])}>{status.toLowerCase()}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        {p.xpReward} XP
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-3 font-semibold group-hover:text-primary">{p.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{p.course.title}</span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      Open <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {projects.length === 0 && (
        <Card>
          <CardContent className="pt-8 text-center text-sm text-muted-foreground">No projects published yet.</CardContent>
        </Card>
      )}
    </div>
  );
}
