"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlanItemToggle({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();

  async function toggle() {
    await fetch(`/api/study-plan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: done ? "PENDING" : "DONE" }),
    });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      className={cn(
        "shrink-0 rounded-full p-0.5 transition hover:scale-110",
        done ? "text-success" : "text-muted-foreground hover:text-primary"
      )}
    >
      {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
    </button>
  );
}
