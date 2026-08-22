import * as React from "react";
import { cn } from "@/lib/utils";

/** Keyboard key hint used in search palettes, tooltips and empty states. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-sunken px-1.5 font-mono text-[0.6875rem] font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}
