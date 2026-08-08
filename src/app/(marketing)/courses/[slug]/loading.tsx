import { Card, CardContent } from "@/components/ui/card";

/** Mobile-friendly skeleton for the course detail page while server data streams in. */
export default function CourseDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="mb-4 flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-9 w-3/4 max-w-lg sm:h-10" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-5 w-2/3 max-w-xl" />

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="mt-8 max-w-md">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-2 w-full rounded-full" />
          </div>
        </div>

        <aside className="lg:pt-2">
          <Card className="overflow-hidden">
            <Skeleton className="h-24 w-full rounded-none" />
            <CardContent className="p-5">
              <div className="mb-4 grid grid-cols-2 gap-y-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-11 w-full rounded-lg" />
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="mt-14">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-2 mb-6 h-4 w-64" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-1 rounded-md border border-border p-1">
                  {[0, 1, 2, 3].map((j) => (
                    <Skeleton key={j} className="mx-2 my-1.5 h-5 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-secondary/70 ${className ?? ""}`} />;
}
