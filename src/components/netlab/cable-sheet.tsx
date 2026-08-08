"use client";

import { Check, Plug } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { CABLE_CHOICES } from "./cable-choices";
import { CABLE_TYPES } from "@/lib/net/types";
import type { CableType } from "@/lib/net/types";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

/**
 * Mobile cable-type selector. Reuses the exact same cable definitions and
 * choices as the desktop CableChooser so both platforms update the same
 * `cableType` in the shared simulation store and create real cables.
 */
export function CableSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { cableType, setCableType, setTool, setLearn } = useNetlab();

  const pick = (t: CableType) => {
    setCableType(t);
    setTool("cable");
    onOpenChange(false);
    const def = CABLE_TYPES[t];
    setLearn({ title: `${def.friendly} — ${def.label}`, body: def.purpose, kind: "info" });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Select Cable Type"
      description="Pick a cable, then tap the two devices you want to connect."
    >
      <div className="space-y-2">
        {CABLE_CHOICES.map((c) => {
          const def = CABLE_TYPES[c.type];
          const active = cableType === c.type;
          return (
            <button
              key={c.type}
              onClick={() => pick(c.type)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition active:scale-[0.99]",
                active ? "border-primary/50 bg-primary/10" : "border-border bg-background/60 hover:border-primary/30 hover:bg-secondary"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: def.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{def.friendly}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.scene} — {c.tech}
                  </p>
                </div>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </div>
              <p className="mt-1.5 pl-5 text-xs leading-snug text-muted-foreground">{def.purpose}</p>
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-secondary/60 px-3 py-2.5 text-xs leading-snug text-muted-foreground">
        <Plug className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Pick a cable, then tap the first device and the second device. The lab explains why each cable works — invalid
        combinations are rejected with a reason.
      </p>
    </BottomSheet>
  );
}
