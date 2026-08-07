"use client";

import { useState } from "react";
import { History, ChevronDown, ChevronUp, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { cn } from "@/lib/utils";

export function CmdLog() {
  const cmdLog = useNetlab((s) => s.cmdLog);
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("shrink-0 border-t border-border bg-card/70 backdrop-blur", open ? "h-44" : "h-9")}>
      <div className="flex h-9 items-center gap-2 px-3">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          <History className="h-3.5 w-3.5" />
          Activity Log
          {cmdLog.length > 0 && <span className="rounded-full bg-secondary px-1.5 text-[10px] text-muted-foreground">{cmdLog.length}</span>}
        </button>
        {cmdLog.length > 0 && (
          <button
            onClick={() => useNetlab.getState().clearCmdLog()}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
      {open && (
        <div className="h-[calc(100%-2.25rem)] overflow-y-auto px-3 pb-3">
          {cmdLog.length === 0 ? (
            <p className="pt-2 text-xs text-muted-foreground">
              No commands yet — open a device&apos;s Command Prompt (double-click it, then the Command Prompt tab) and run ping, ipconfig, arp&hellip;
            </p>
          ) : (
            <div className="space-y-1 pt-2">
              {cmdLog.map((e) => (
                <div key={e.id} className="flex items-start gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5">
                  <span className="mt-0.5 shrink-0">
                    {e.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">
                      <span className="font-mono font-medium">{e.command}</span>
                      <span className="ml-2 text-muted-foreground">on {e.device}</span>
                    </p>
                    {e.reason && <p className="truncate text-[11px] text-destructive/90">{e.reason}</p>}
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{e.at}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
