"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, Lightbulb } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { cmdSuggestions } from "@/lib/net/commands";
import { cn } from "@/lib/utils";

export function CliTerminal({ deviceId, compact }: { deviceId: string; compact?: boolean }) {
  const { cmd, openCmd, runCmd, clearCmd, sim } = useNetlab();
  const [value, setValue] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [active, setActive] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const session = cmd?.deviceId === deviceId ? cmd : null;

  useEffect(() => {
    if (!cmd || cmd.deviceId !== deviceId) openCmd(deviceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [session?.lines.length, session?.busy]);

  if (!session) return null;
  const device = sim.devices.find((d) => d.id === deviceId);
  const host = device?.config.hostname ?? "device";
  const prompt = `C:\\Users\\${host}>`;

  const suggestions = value.trim() ? cmdSuggestions(sim.netSnapshot(), deviceId, value) : [];
  const highlighted = suggestions[active] ?? suggestions[0];

  const submit = (text: string) => {
    if (!text.trim() || session.busy) return;
    void runCmd(deviceId, text);
    setValue("");
    setHistoryIdx(-1);
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (session.busy) {
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      submit(value);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (highlighted) {
        setValue(highlighted.cmd);
        setActive(0);
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = session.history;
      if (h.length === 0) return;
      const next = historyIdx === -1 ? h.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(next);
      setValue(h[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = session.history;
      if (h.length === 0) return;
      const next = historyIdx === -1 ? -1 : Math.min(h.length - 1, historyIdx + 1);
      setHistoryIdx(next);
      setValue(next === -1 ? "" : h[next]);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
      e.preventDefault();
      clearCmd();
      return;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-[#0b0e14]">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-[#161b26] px-3 py-1.5">
        <Terminal className="h-3.5 w-3.5 text-sky-400" />
        <span className="font-mono text-[11px] text-slate-300">
          Command Prompt — {host}
        </span>
        {!compact && (
          <span className="ml-auto text-[10px] text-slate-500">↑ history · Tab complete · Ctrl+L clear</span>
        )}
      </div>

      <div className={cn("relative flex-1 overflow-y-auto p-2 font-mono text-[12px] leading-relaxed", compact ? "min-h-[240px]" : "min-h-[280px]")}>
        {session.lines.map((l, i) => {
          if (l.kind === "in") {
            return (
              <div key={i} className="whitespace-pre-wrap">
                <span className="text-emerald-400">{prompt}</span> <span className="text-slate-100">{l.text}</span>
              </div>
            );
          }
          return (
            <pre key={i} className={cn("whitespace-pre-wrap", lineColor(l.status))}>
              {l.text || " "}
            </pre>
          );
        })}
        <div ref={bottomRef} />

        {suggestions.length > 0 && !session.busy && (
          <div className="absolute inset-x-2 top-2 overflow-hidden rounded-md border border-slate-700 bg-slate-900/95 shadow-xl">
            <div className="flex items-center gap-1.5 border-b border-slate-800 px-2 py-1 text-[10px] text-slate-400">
              <Lightbulb className="h-3 w-3 text-amber-400" />
              {highlighted?.explain ?? "Press Tab to complete"}
            </div>
            <div className="max-h-28 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={s.cmd}
                  onClick={() => {
                    setValue(s.cmd);
                    setActive(0);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1 text-left font-mono text-[11px]",
                    i === active ? "bg-sky-500/15 text-sky-200" : "text-slate-400"
                  )}
                >
                  <span className="text-sky-400">›</span>
                  <span className="truncate">{s.cmd}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-800 bg-[#161b26] px-2 py-1.5">
        <span className="shrink-0 font-mono text-xs text-emerald-400">{prompt}</span>
        <div className="relative flex flex-1 items-center">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setActive(0);
              setHistoryIdx(-1);
            }}
            onKeyDown={onKeyDown}
            autoFocus
            disabled={session.busy}
            spellCheck={false}
            autoComplete="off"
            className={cn(
              "w-full bg-transparent font-mono text-xs text-slate-100 outline-none placeholder:text-slate-600 disabled:cursor-wait",
              session.busy && "caret-transparent"
            )}
            placeholder={session.busy ? "running…" : "type a command"}
          />
          {!value && !session.busy && (
            <span className="pointer-events-none absolute left-0 h-3.5 w-[7px] animate-pulse bg-emerald-400/90" />
          )}
          {session.busy && <span className="ml-2 shrink-0 animate-pulse text-[10px] text-amber-400">executing…</span>}
        </div>
      </div>
    </div>
  );
}

function lineColor(status: "ok" | "warn" | "error" | undefined): string {
  if (status === "error") return "text-red-400";
  if (status === "warn") return "text-amber-300";
  if (status === "ok") return "text-emerald-300";
  return "text-slate-300";
}
