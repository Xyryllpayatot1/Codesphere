import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type CoverAssetView = {
  url: string;
  filename?: string;
  size?: number;
  id?: string;
};

/**
 * Release cover image with a professional branded placeholder fallback.
 * Always re-encodes/validates nothing here — this is pure display.
 */
export function ReleaseCover({
  cover,
  alt,
  priority = false,
  className,
  rounded = true,
}: {
  cover: CoverAssetView | null | undefined;
  alt: string;
  priority?: boolean;
  className?: string;
  rounded?: boolean;
}) {
  const container = cn(
    "relative overflow-hidden bg-gradient-to-br from-primary/15 via-secondary/10 to-background",
    rounded && "rounded-xl",
    className
  );

  if (!cover?.url) {
    return (
      <div className={cn(container, "flex flex-col items-center justify-center gap-2")} aria-label={alt} role="img">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">CreyvaPH Update</span>
      </div>
    );
  }

  return (
    <div className={container}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover.url}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export function releaseCoverAlt(version: string, title: string): string {
  return `CreyvaPH v${version} ${title} update`;
}
