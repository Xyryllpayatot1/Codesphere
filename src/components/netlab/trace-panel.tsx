"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Radar, Send, Stethoscope, CheckCircle2, XCircle, AlertTriangle, Search } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { explainStep, diagnosisTip } from "@/lib/net/explain";
import { packetView } from "@/lib/net/inspector";
import type { PacketType, TraceStep } from "@/lib/net/types";
import { cn } from "@/lib/utils";

const LAYER_COLOR: Record<TraceStep["layer"], string> = {
  L1: "bg-slate-500/20 text-slate-300",
  L2: "bg-sky-500/20 text-sky-400",
  L3: "bg-emerald-500/20 text-emerald-400",
  L4: "bg-amber-500/20 text-amber-400",
  L7: "bg-rose-500/20 text-rose-400",
};

const PACKET_TYPES: { value: PacketType; label: string }[] = [
  { value: "icmp", label: "Ping (ICMP)" },
  { value: "http", label: "HTTP" },
  { value: "dns", label: "DNS" },
  { value: "dhcp", label: "DHCP" },
  { value: "ftp", label: "FTP" },
];

/**
 * Packet Lab. `variant="bar"` renders the collapsible bar docked under the
 * canvas (desktop). `variant="sheet"` renders a full-height panel for use
 * inside a bottom sheet (mobile).
 */
export function TracePanel({ variant = "bar" }: { variant?: "bar" | "sheet" } = {}) {
  const state = useNetlab();
  const { sim, trace, diagnosis, pingSourceId, runPing, runPacket, runDiagnose, select } = state;
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [type, setType] = useState<PacketType>("icmp");
  const [inspectIndex, setInspectIndex] = useState<number | null>(null);

  const sources = sim.devices.filter((d) => d.config.interfaces.some((i) => i.ip));
  const targets = sim.devices.filter((d) => d.config.interfaces.some((i) => i.ip));
  const sourceId = pingSourceId ?? sources[0]?.id ?? "";

  const send = () => {
    if (!sourceId || !target.trim()) return;
    if (type === "icmp") runPing(sourceId, target.trim());
    else runPacket(sourceId, target.trim(), type);
    setOpen(true);
  };

  const controls = (
    <div className="flex h-9 items-center gap-2 px-3">
      {variant === "bar" && (
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          Packet Lab
        </button>
      )}
      <select
        value={sourceId}
        onChange={(e) => select(e.target.value)}
        className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        title="Source device"
      >
        {sources.length === 0 && <option value="">No source with an IP</option>}
        {sources.map((d) => (
          <option key={d.id} value={d.id}>
            {d.config.hostname}
          </option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground">→</span>
      <input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder="Destination IP (e.g. 192.168.1.51)"
        className="h-7 w-40 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring md:w-56"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as PacketType)}
        className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {PACKET_TYPES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        onClick={send}
        disabled={!sourceId || !target.trim()}
        className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
      >
        <Send className="h-3.5 w-3.5" /> Send
      </button>
      <button
        onClick={() => sourceId && target.trim() && runDiagnose(sourceId, target.trim())}
        disabled={!sourceId || !target.trim()}
        className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium transition hover:bg-secondary/70 disabled:opacity-40"
      >
        <Stethoscope className="h-3.5 w-3.5" /> Diagnose
      </button>
      <div className="ml-auto hidden items-center gap-1.5 overflow-hidden md:flex">
        {targets.slice(0, 5).map((d) => {
          const ip = d.config.interfaces.find((i) => i.ip)?.ip;
          return ip ? (
            <button
              key={d.id}
              onClick={() => setTarget(ip)}
              className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {d.config.hostname} {ip}
            </button>
          ) : null;
        })}
      </div>
    </div>
  );

  const content = (
    <div className="overflow-y-auto px-3 pb-3">
      {!trace && !diagnosis && (
        <p className="pt-2 text-xs text-muted-foreground">
          Pick a source device (Ping tool or dropdown), type a destination IP, then send a packet and watch it hop through the network one layer at a time.
        </p>
      )}

      {diagnosis && !trace && (
        <div className="mt-2 space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4" /> {diagnosis.message}
          </p>
          <p className="text-xs text-amber-200/80">{diagnosisTip(diagnosis.step)}</p>
          <p className="text-xs text-amber-200/60">{diagnosis.hint}</p>
        </div>
      )}

      {trace && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">
              {trace.type.toUpperCase()} {trace.sourceId.slice(0, 6)} → {trace.target}
            </p>
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", trace.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
              {trace.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {trace.ok ? "REACHED" : "BLOCKED"}
            </span>
          </div>
          {trace.steps.map((s, i) => {
            const active = inspectIndex === i;
            return (
              <button
                key={i}
                onClick={() => setInspectIndex(active ? null : i)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left transition",
                  active ? "border-primary/50 bg-primary/5" : "border-border bg-background/60 hover:border-primary/30"
                )}
              >
                <span className={cn("mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold", LAYER_COLOR[s.layer])}>{s.layer}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{s.deviceLabel} — {s.action}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">{explainStep(s)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {s.status === "fail" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  <Search className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground/50")} />
                </div>
              </button>
            );
          })}
          {inspectIndex !== null && trace.steps[inspectIndex] && <PacketInspector trace={trace} stepIndex={inspectIndex} />}
          <div className="flex items-center gap-2 pt-1">
            <Radar className="h-4 w-4 shrink-0 text-primary" />
            <p className={cn("text-xs font-medium", trace.ok ? "text-success" : "text-destructive")}>{trace.summary}</p>
            {trace.error && <p className="text-xs text-muted-foreground">{trace.error}</p>}
          </div>
          {trace.fault && <FaultCard fault={trace.fault} />}
          <p className="pt-0.5 text-[11px] italic text-muted-foreground">{explainTip(trace.ok)}</p>
        </div>
      )}
    </div>
  );

  if (variant === "sheet") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-border bg-card/70">
          {controls}
        </div>
        <div className="min-h-0 flex-1 bg-card/70">{content}</div>
      </div>
    );
  }

  return (
    <div className={cn("shrink-0 border-t border-border bg-card/70 backdrop-blur", open ? "h-56" : "h-9")}>
      {controls}
      {open && <div className="h-[calc(100%-2.25rem)]">{content}</div>}
    </div>
  );
}

function PacketInspector({ trace, stepIndex }: { trace: import("@/lib/net/types").TraceResult; stepIndex: number }) {
  const { sim } = useNetlab();
  const view = packetView(sim.netSnapshot(), trace, stepIndex);
  return (
    <div className="space-y-1.5 rounded-lg border border-primary/25 bg-card p-2.5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
          <Search className="h-3.5 w-3.5" />
          {view.protocol} packet · {view.bytes} bytes · layer {view.layer}
        </p>
        <span className="font-mono text-[10px] text-muted-foreground">{view.checksum}</span>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">{view.detail}</p>
      <div className="space-y-1">
        {view.fields.map((f, i) => (
          <div key={i} className="grid grid-cols-[7.5rem_1fr] items-baseline gap-2 rounded-md bg-background/60 px-2 py-1">
            <span className="font-mono text-[10px] font-medium text-slate-400">{f.name}</span>
            <div>
              <p className="font-mono text-[11px] leading-snug text-foreground">{f.value}</p>
              <p className="text-[10px] leading-snug text-muted-foreground">{f.explain}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaultCard({ fault }: { fault: import("@/lib/net/types").PingFault }) {
  return (
    <div className="mt-1 space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
        <XCircle className="h-3.5 w-3.5" /> {fault.reason}
      </p>
      <p className="text-[11px] leading-snug text-muted-foreground">
        <span className="font-semibold text-foreground">What happened: </span>
        {fault.what}
      </p>
      <p className="text-[11px] leading-snug text-muted-foreground">
        <span className="font-semibold text-foreground">Why: </span>
        {fault.why}
      </p>
      <p className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] leading-snug">
        <span className="font-semibold text-primary">How to fix: </span>
        {fault.fix}
      </p>
    </div>
  );
}

function explainTip(ok: boolean) {
  return ok
    ? "Replies mean the whole path — L1 cables, L2 MAC delivery and L3 routing — is working."
    : "The trace shows exactly where the packet stopped. Use Diagnose to find the first fixable problem.";
}
