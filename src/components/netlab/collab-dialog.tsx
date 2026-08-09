"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Link2, Users } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type CollabDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CollabDialog({ open, onOpenChange }: CollabDialogProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Networking Lab" }),
      });
      if (!res.ok) throw new Error("Could not create room");
      const data = (await res.json()) as { data?: { code: string } };
      const created = data.data ?? (data as { code: string });
      onOpenChange(false);
      router.push(`/room/${created.code}`);
    } catch {
      setError("Could not create the room right now. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async () => {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 5) {
      setError("Room codes are 5 letters/numbers.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${clean}/join`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not join that room.");
        return;
      }
      onOpenChange(false);
      router.push(`/room/${clean}`);
    } catch {
      setError("Could not join the room right now. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Collaborate" description="Work on the same network with friends in real time — edits, cables and pings stay in sync.">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-background/60 p-1">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition",
              tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "create" ? <Users className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            {t === "create" ? "Create a room" : "Join with code"}
          </button>
        ))}
      </div>

      {tab === "create" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            You become the <span className="font-semibold text-foreground">host</span>. Share the room code with anyone on CreyvaPH — they can edit together with you.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Room name (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="e.g. Week 6 — Subnetting review"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <button
            onClick={createRoom}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Create room
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Room code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
              placeholder="ABCDE"
              autoCapitalize="characters"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center font-mono text-lg tracking-[0.35em] uppercase outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <button
            onClick={joinRoom}
            disabled={busy || code.length !== 5}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Join room
          </button>
        </div>
      )}
    </Dialog>
  );
}
