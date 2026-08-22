"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-sunken">
        <AlertTriangle className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="mt-4 text-lg font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        This page failed to load. It may be a temporary issue — try again.
      </p>
      <div className="mt-6">
        <Button onClick={reset}>Try again</Button>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-2xs text-muted-foreground/70">Reference: {error.digest}</p>
      )}
    </div>
  );
}
