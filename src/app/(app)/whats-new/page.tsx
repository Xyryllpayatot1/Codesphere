import { Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import { listPublishedReleases } from "@/lib/services/releases";
import { ReleaseCard } from "@/components/releases/release-card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "What's New | CodeSphere",
  description: "Latest updates and improvements in CodeSphere.",
};

export default async function WhatsNewPage() {
  await getSession();
  const releases = await listPublishedReleases();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-4 w-4" /> What&apos;s new
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">CodeSphere Updates</h1>
        <p className="text-sm text-muted-foreground">What&apos;s changed, fixed, and improved across CodeSphere.</p>
      </header>

      {releases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No updates published yet — check back soon.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      )}
    </div>
  );
}
