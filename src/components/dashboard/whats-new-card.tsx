import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ReleaseCover, releaseCoverAlt, type CoverAssetView } from "@/components/releases/release-cover";

export type LatestReleaseView = {
  id: string;
  version: string;
  title: string;
  summary: string;
  releaseDate: Date;
  coverImage: CoverAssetView | null;
  seen?: boolean;
};

/**
 * "What's New" feature card for the dashboard. Only ever renders the single
 * latest published release — historical covers are never loaded here.
 */
export function WhatsNewCard({ release }: { release: LatestReleaseView }) {
  const alt = releaseCoverAlt(release.version, release.title);
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> What&apos;s new
            {!release.seen && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                New
              </span>
            )}
          </p>
          <Link href="/whats-new" className="text-xs font-medium text-muted-foreground transition hover:text-primary">
            All updates
          </Link>
        </div>

        <Link href={`/whats-new/${release.id}`} className="group block">
          <ReleaseCover cover={release.coverImage} alt={alt} className="aspect-video rounded-none" rounded={false} />
          <div className="space-y-2 p-5">
            <p className="font-mono text-xs font-semibold tracking-wider text-primary">{release.version}</p>
            <h3 className="text-lg font-semibold leading-snug tracking-tight">{release.title}</h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">{release.summary}</p>
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-xs text-muted-foreground">{formatDate(release.releaseDate)}</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-0.5">
                View update <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
