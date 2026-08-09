import Link from "next/link";
import { Award, GraduationCap } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const session = await requireSession();
  const userId = session.id;

  const [certificates, worldCertificates] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true, slug: true, color: true, icon: true } },
      },
    }),
    prisma.worldCertificate.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      include: {
        user: { select: { name: true } },
        world: { select: { name: true, slug: true, color: true, icon: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <GraduationCap className="h-6 w-6 text-primary" /> Certificates
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete every lesson in a course, or defeat a world boss, to earn a verified certificate.
        </p>
      </div>

      {certificates.length === 0 && worldCertificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 pt-10 text-center">
            <Award className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You haven&apos;t earned a certificate yet.</p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/courses">Start a course</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {worldCertificates.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                World certificates
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {worldCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6"
                    style={{ borderColor: `${cert.world.color}66`, background: `linear-gradient(135deg, ${cert.world.color}22, var(--card), var(--accent))` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-4xl" aria-hidden>
                        {cert.world.icon}
                      </span>
                      <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${cert.world.color}22`, color: cert.world.color }}>
                        {cert.code}
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-bold">{cert.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Awarded to <span className="font-medium text-foreground">{cert.user.name}</span> on{" "}
                      {cert.issuedAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      CreyvaPH Programming Worlds · Verified by certificate ID {cert.code}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {certificates.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Course certificates
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/15 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-4xl" aria-hidden>
                        {cert.course.icon}
                      </span>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {cert.code}
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-bold">{cert.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Awarded to <span className="font-medium text-foreground">{cert.user.name}</span> on{" "}
                      {cert.issuedAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      CreyvaPH · Verified by certificate ID {cert.code}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
