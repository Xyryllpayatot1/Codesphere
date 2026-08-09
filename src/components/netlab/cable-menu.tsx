"use client";

import { useRef, useState } from "react";
import { Cable, Check, ChevronDown, Plug } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { CABLE_CHOICES } from "./cable-choices";
import { CABLE_TYPES } from "@/lib/net/types";
import type { CableType } from "@/lib/net/types";
import { cn } from "@/lib/utils";

export function CableChooser() {
  const { cableType, setCableType, setTool, setLearn } = useNetlab();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const pick = (t: CableType) => {
    setCableType(t);
    setTool("cable");
    setOpen(false);
    const def = CABLE_TYPES[t];
    setLearn({ title: `${def.friendly} — ${def.label}`, body: def.purpose, kind: "info" });
  };

  const current = CABLE_TYPES[cableType];

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition",
          cableType !== "copperStraight" ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background text-foreground"
        )}
        title="Choose a cable, then click two devices to connect them"
      >
        <span className="h-2 w-2 rounded-full" style={{ background: current.color }} />
        <span>{current.friendly}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1 w-80 rounded-xl border border-border bg-card p-2 shadow-2xl">
            <p className="flex items-center gap-1.5 px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Plug className="h-3 w-3" /> What are you connecting?
            </p>
            <div className="space-y-1">
              {CABLE_CHOICES.map((c) => {
                const def = CABLE_TYPES[c.type];
                const active = cableType === c.type;
                return (
                  <button
                    key={c.type}
                    onClick={() => pick(c.type)}
                    className={cn(
                      "group w-full rounded-lg border p-2 text-left transition",
                      active ? "border-primary/50 bg-primary/10" : "border-border bg-background/60 hover:border-primary/30 hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: def.color }} />
                      <span className="text-xs font-semibold">{c.scene}</span>
                      <span className="text-[10px] text-muted-foreground">— {c.tech}</span>
                      {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />}
                    </div>
                    <p className="mt-1 pl-5 text-[11px] leading-snug text-muted-foreground">{def.purpose}</p>
                    <p className="mt-1 pl-5 text-[11px] leading-snug text-muted-foreground/70">
                      <span className="font-semibold text-muted-foreground">Why it works: </span>
                      {c.why}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 px-2 pb-1 text-[10px] text-muted-foreground">
              Pick a cable, then click the first device and the second device. <Cable className="inline h-3 w-3" /> The lab explains why each cable works.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
