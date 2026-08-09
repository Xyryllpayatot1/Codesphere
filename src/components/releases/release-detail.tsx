import { Sparkles, TrendingUp, Wrench } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RELEASE_CHANGE_TYPES, type ReleaseChangeType } from "@/lib/constants";
import { ReleaseCover, releaseCoverAlt, type CoverAssetView } from "./release-cover";

export type ReleaseChangeView = {
  id?: string;
  type: string;
  title: string;
  description: string;
};

export type ReleaseDetailView = {
  id: string;
  version: string;
  title: string;
  summary: string;
  description: string;
  releaseDate: Date | string;
  coverImage: CoverAssetView | null;
  changes: ReleaseChangeView[];
};

const CHANGE_ICONS: Record<ReleaseChangeType, typeof Sparkles> = {
  new: Sparkles,
  improvement: TrendingUp,
  fix: Wrench,
};

const SECTION_ORDER: ReleaseChangeType[] = [
  RELEASE_CHANGE_TYPES.NEW,
  RELEASE_CHANGE_TYPES.IMPROVEMENT,
  RELEASE_CHANGE_TYPES.FIX,
];

/**
 * Full release detail view. Used by the public detail page and by the admin
 * "Preview" action so admins see exactly what users will see.
 */
export function ReleaseDetail({ release }: { release: ReleaseDetailView }) {
  const alt = releaseCoverAlt(release.version, release.title);

  const sections = SECTION_ORDER.map((type) => ({
    type,
    items: release.changes.filter((c) => c.type === type),
  })).filter((s) => s.items.length > 0);

  return (
    <article className="space-y-8">
      <ReleaseCover cover={release.coverImage} alt={alt} priority className="aspect-video rounded-2xl" />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md border border-border bg-secondary/60 px-2 py-1 font-mono text-xs font-semibold tracking-wider text-primary">
            CreyvaPH {release.version}
          </span>
          <time className="text-xs text-muted-foreground">{formatDate(release.releaseDate)}</time>
        </div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{release.title}</h1>
        {release.summary && <p className="text-base text-muted-foreground">{release.summary}</p>}
      </header>

      {release.description && (
        <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{release.description}</div>
      )}

      {sections.map(({ type, items }) => {
        const Icon = CHANGE_ICONS[type];
        const heading =
          type === RELEASE_CHANGE_TYPES.NEW
            ? "New features"
            : type === RELEASE_CHANGE_TYPES.IMPROVEMENT
              ? "Improvements"
              : "Bug fixes";
        return (
          <section key={type}>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="h-4 w-4 text-primary" />
              {heading}
            </h2>
            <ul className="mt-3 space-y-2.5">
              {items.map((item) => (
                <li key={item.id ?? `${type}-${item.title}`} className="rounded-xl border border-border bg-card/60 p-3.5">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </article>
  );
}
