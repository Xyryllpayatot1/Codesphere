import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectSubmitter } from "@/components/projects/project-submitter";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: PageProps<"/projects/[slug]">) {
  const session = await requireSession();
  const { slug } = await params;

  const project = await prisma.project.findFirst({
    where: { slug, isPublished: true },
    include: {
      course: { select: { title: true, slug: true, color: true } },
      submissions: {
        where: { userId: session.id },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!project) notFound();

  const submission = project.submissions[0];
  const requirements = project.requirements as string[];

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{project.course.title}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{project.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {submission ? (
            submission.status === "APPROVED" ? (
              <Badge className="bg-success/10 text-success">
                <CheckCircle2 className="h-3 w-3" /> Approved
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-600">
                <Clock className="h-3 w-3" /> {submission.status === "REJECTED" ? "Needs changes" : "Under review"}
              </Badge>
            )
          ) : (
            <Badge variant="outline">{project.xpReward} XP</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-5">
            <h2 className="font-semibold">Requirements</h2>
            <ul className="mt-3 space-y-2">
              {requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: project.course.color }}
                    aria-hidden
                  />
                  {req}
                </li>
              ))}
            </ul>
            {submission?.feedback && (
              <div
                className={cn(
                  "mt-4 rounded-lg p-3 text-sm",
                  submission.status === "APPROVED" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-700"
                )}
              >
                <p className="font-semibold">Feedback</p>
                <p className="mt-1 whitespace-pre-wrap font-mono text-xs">{submission.feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <ProjectSubmitter
              slug={project.slug}
              starterCode={project.starterCode}
              previousCode={submission?.code ?? null}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
