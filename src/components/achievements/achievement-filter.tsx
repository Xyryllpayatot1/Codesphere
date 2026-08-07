"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function AchievementFilter({ categories, active }: { categories: string[]; active: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(category: string | null) {
    if (!category) {
      router.push("/achievements");
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("cat", category);
    router.push(`/achievements?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => select(null)}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition",
          active === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
        )}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => select(c)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
            active === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          {c.toLowerCase()}
        </button>
      ))}
    </div>
  );
}
