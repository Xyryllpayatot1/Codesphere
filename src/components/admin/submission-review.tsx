"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmissionReview({ id }: { id: string }) {
  const router = useRouter();

  async function review(action: "APPROVED" | "REJECTED") {
    await fetch(`/api/admin/submissions/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        className="bg-success text-white hover:bg-success/90"
        onClick={() => review("APPROVED")}
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
      </Button>
      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => review("REJECTED")}>
        <XCircle className="h-3.5 w-3.5" /> Reject
      </Button>
    </div>
  );
}
