import { Skeleton } from "@/components/ui/skeleton";

/**
 * Default loading state for the authenticated app shell. Matches the common
 * page pattern (header + stat/content grid) so navigation feels instant
 * without a global spinner.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[5.25rem]" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
