"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronUp,
  Copy,
  Crown,
  Loader2,
  Lock,
  LockOpen,
  LogOut,
  MessageSquare,
  Minimize2,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  Trash2,
  Users,
  Activity,
} from "lucide-react";
import { useCollab } from "./collab-store";
import { useNetlab } from "./netlab-store";
import { cn } from "@/lib/utils";
import type { RoomMemberInfo, RoomRole } from "@/lib/rooms/types";

const ROLE_STYLE: Record<RoomRole, { label: string; cls: string }> = {
  HOST: { label: "Host", cls: "bg-amber-500/15 text-amber-600" },
  COLLABORATOR: { label: "Can edit", cls: "bg-cyan-500/15 text-cyan-600" },
  VIEWER: { label: "View only", cls: "bg-zinc-500/15 text-zinc-500" },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function StatusDot({ status }: { status: RoomMemberInfo["status"] }) {
  return (
    <span
      className={cn(
        "h-2 w-2 shrink-0 rounded-full",
        status === "online" ? "bg-emerald-500" : status === "idle" ? "bg-amber-500" : "bg-zinc-400"
      )}
    />
  );
}

type PanelProps = { code: string };

export function CollabPanel({ code }: PanelProps) {
  const router = useRouter();
  const collab = useCollab();
  const [tab, setTab] = useState<"members" | "chat" | "activity">("members");
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [chatText, setChatText] = useState("");
  const [busyAction, setBusyAction] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const connected = collab.status === "connected";

  useEffect(() => {
    if (collab.code !== code) {
      void useCollab.getState().connect(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [collab.messages.length, tab]);

  useEffect(() => {
    const unsub = useNetlab.subscribe((state, prev) => {
      if (state.selectedDeviceId !== prev.selectedDeviceId) {
        useCollab.getState().reportPresence({ activeDeviceId: state.selectedDeviceId });
      }
    });
    return unsub;
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(collab.code ?? code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const leave = async () => {
    await useCollab.getState().leave();
    router.push("/networking");
  };

  const hostRun = async (action: string, body?: Record<string, unknown>) => {
    setBusyAction(true);
    const res = await useCollab.getState().hostAction(action, body);
    if (!res.ok) {
      // error surfaces via toast in hostAction callers — show inline
      console.warn(`host action failed: ${action}`, res.error);
    }
    setBusyAction(false);
  };

  const isHost = collab.role === "HOST";
  const selfId = collab.me;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute right-3 top-16 z-40 flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-2 text-xs font-semibold shadow-xl backdrop-blur transition hover:bg-card"
        title="Open room panel"
      >
        <span className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
        <span className="font-mono tracking-widest">{collab.code ?? code}</span>
        <span className="text-muted-foreground">· {collab.members.length}</span>
        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="absolute inset-x-3 bottom-20 top-24 z-40 flex flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur lg:inset-x-auto lg:bottom-24 lg:right-3 lg:top-16 lg:w-[22rem]">
      {/* header */}
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{collab.room?.name ?? "Room"}</p>
            <p className="text-[10px] text-muted-foreground">
              {connected ? "Connected" : collab.status === "reconnecting" ? "Reconnecting…" : "Connecting…"}
              {collab.room?.isLocked && " · Locked"}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground" title="Minimize panel">
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1 font-mono text-sm font-semibold tracking-widest transition hover:bg-secondary"
            title="Copy room code"
          >
            {collab.code ?? code}
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          <span className="text-[11px] text-muted-foreground">{collab.members.length} online</span>
        </div>
      </div>

      {/* tabs */}
      <div className="grid grid-cols-3 gap-1 border-b border-border bg-background/40 p-1.5">
        {(
          [
            { key: "members", label: "Members", icon: <Users className="h-3.5 w-3.5" /> },
            { key: "chat", label: "Chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
            { key: "activity", label: "Activity", icon: <Activity className="h-3.5 w-3.5" /> },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition",
              tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {tab === "members" && (
          <div className="space-y-1.5">
            {collab.members.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Waiting for members…</p>}
            {collab.members.map((m) => {
              const isSelf = m.userId === selfId;
              const style = ROLE_STYLE[m.role];
              return (
                <div key={m.userId} className={cn("flex items-center gap-2.5 rounded-xl border border-border bg-background/60 p-2", isSelf && "border-primary/30")}>
                  <span className="relative">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(m.name)}</span>
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={m.status} />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">
                      {m.name}
                      {isSelf && <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>}
                    </p>
                    <span className={cn("mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", style.cls)}>
                      {m.role === "HOST" && <Crown className="h-3 w-3" />}
                      {style.label}
                    </span>
                    {m.status === "idle" && <span className="ml-1.5 text-[10px] text-muted-foreground">idle</span>}
                  </div>
                  {isHost && !isSelf && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => hostRun("role", { userId: m.userId, role: m.role === "COLLABORATOR" ? "VIEWER" : "COLLABORATOR" })}
                        title={m.role === "COLLABORATOR" ? "Make viewer" : "Make editor"}
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => hostRun("kick", { userId: m.userId })}
                        title="Remove from room"
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "chat" && (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
              {collab.messages.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No messages yet — say hi.</p>}
              {collab.messages.map((m) => (
                <div key={m.id} className={cn("flex", m.authorId === selfId ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] rounded-xl px-3 py-1.5", m.authorId === selfId ? "bg-primary text-primary-foreground" : "border border-border bg-background/70")}>
                    {m.authorId !== selfId && <p className="text-[10px] font-semibold opacity-70">{m.author}</p>}
                    <p className="text-sm leading-snug">{m.text}</p>
                    <p className={cn("mt-0.5 text-right text-[9px]", m.authorId === selfId ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.at}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatText.trim()) return;
                void useCollab.getState().sendChat(chatText);
                setChatText("");
              }}
              className="flex items-center gap-1.5 border-t border-border pt-2"
            >
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Message the room…"
                maxLength={500}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition focus:border-primary/60"
              />
              <button type="submit" disabled={!chatText.trim()} className="rounded-lg bg-primary p-2 text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {tab === "activity" && (
          <div className="space-y-1.5">
            {collab.activity.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Room activity will show up here.</p>}
            {collab.activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5">
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    a.kind === "system" ? "bg-amber-500" : a.kind === "packet" ? "bg-emerald-500" : a.kind === "command" ? "bg-violet-500" : "bg-cyan-500"
                  )}
                />
                <p className="min-w-0 flex-1 text-xs leading-snug text-foreground">{a.text}</p>
                <span className="shrink-0 text-[9px] text-muted-foreground">{a.at}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* footer — host controls + leave */}
      <div className="space-y-2 border-t border-border bg-background/40 p-2.5">
        {isHost && (
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => hostRun(collab.room?.isLocked ? "unlock" : "lock")}
              className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background/60 py-1.5 text-[10px] font-medium transition hover:bg-secondary"
              title={collab.room?.isLocked ? "Unlock editing" : "Lock editing"}
            >
              {collab.room?.isLocked ? <LockOpen className="h-3.5 w-3.5 text-emerald-500" /> : <Lock className="h-3.5 w-3.5 text-amber-500" />}
              {collab.room?.isLocked ? "Unlock" : "Lock"}
            </button>
            <button
              onClick={() => hostRun("save")}
              className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background/60 py-1.5 text-[10px] font-medium transition hover:bg-secondary"
              title="Save a snapshot now"
            >
              <Save className="h-3.5 w-3.5 text-cyan-500" />
              Save
            </button>
            <button
              onClick={() => {
                const snapshot = useNetlab.getState().sim.snapshot;
                void hostRun("reset", { snapshot });
              }}
              className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background/60 py-1.5 text-[10px] font-medium transition hover:bg-secondary"
              title="Reset the workspace to an empty canvas"
            >
              <RotateCcw className="h-3.5 w-3.5 text-violet-500" />
              Reset
            </button>
            <button
              onClick={() => hostRun("close").then(() => router.push("/networking"))}
              className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background/60 py-1.5 text-[10px] font-medium transition hover:bg-destructive/10"
              title="Close the room for everyone"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
              Close
            </button>
          </div>
        )}
        <button
          onClick={leave}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/60 py-2 text-xs font-semibold transition hover:bg-destructive/10 hover:text-destructive"
        >
          {busyAction && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <LogOut className="h-3.5 w-3.5" />
          {isHost ? "Close room & leave" : "Leave room"}
        </button>
      </div>
    </div>
  );
}
