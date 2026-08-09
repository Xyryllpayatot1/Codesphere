"use client";

import { GraduationCap } from "lucide-react";
import { LAB_LEVELS, type LabLevel } from "./lab-levels";
import { cn } from "@/lib/utils";

export function LabLevelSelect({ level, onChange }: { level: LabLevel; onChange: (level: LabLevel) => void }) {
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-xl backdrop-blur">
      <span className="flex items-center gap-1 pl-1.5 pr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <GraduationCap className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline">Level</span>
      </span>
      {LAB_LEVELS.map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          title={l.hint}
          className={cn(
            "rounded-lg px-2 py-1 text-[11px] font-medium transition",
            level === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
