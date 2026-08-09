import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSession } from "@/lib/auth";
import { getPublishedRelease } from "@/lib/services/releases";
import { ReleaseDetail } from "@/components/releases/release-detail";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const release = await getPublishedRelease(id);
  return {
    title: release ? `CreyvaPH ${release.version} — ${release.title}` : "What's New | CreyvaPH",
  };
}

export default async function ReleaseDetailPage({ params }: PageProps) {
  await getSession();
  const { id } = await params;
  const release = await getPublishedRelease(id);
  if (!release) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/whats-new"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to updates
      </Link>
      <ReleaseDetail release={release} />
    </div>
  );
}
