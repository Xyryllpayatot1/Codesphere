import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ReleaseCover, releaseCoverAlt } from "./release-cover";
import type { ReleaseSummary } from "@/lib/services/releases";

/**
 * A clean, image-led update card used on the What's New page (and as the base
 * for the dashboard feature). The cover image is the visual anchor; text stays
 * compact so the card is not overcrowded.
 */
export function ReleaseCard({ release }: { release: ReleaseSummary }) {
  const alt = releaseCoverAlt(release.version, release.title);
  return (
    <Link
      href={`/whats-new/${release.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <ReleaseCover cover={release.coverImage} alt={alt} className="aspect-video rounded-none" rounded={false} />
      <div className="space-y-2 p-5">
        <p className="font-mono text-xs font-semibold tracking-wider text-primary">{release.version}</p>
        <h3 className="text-lg font-semibold leading-snug tracking-tight">{release.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{release.summary || release.description}</p>
        <div className="flex items-center justify-between pt-1.5">
          <span className="text-xs text-muted-foreground">{formatDate(release.releaseDate)}</span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-0.5">
            View update <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
