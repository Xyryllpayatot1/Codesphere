"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function EnrollButton({ slug, label = "Enroll free" }: { slug: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function enroll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${slug}/enroll`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Something went wrong");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" size="lg" onClick={enroll} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </Button>
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
