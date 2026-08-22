// ---------------------------------------------------------------------------
// Client collaboration store — room transport + UI state.
//
// The netlab store already applies local edits optimistically and broadcasts
// them through `collabEmitter`; this module owns the SSE stream to the server,
// turns server envelopes into netlab `applyRemoteEvent` calls, and keeps the
// roster / chat / activity feed the panels render.
// ---------------------------------------------------------------------------

"use client";

import { create } from "zustand";
import { useNetlab } from "./netlab-store";
import { toast } from "@/store/use-toast";
import type { RoomEvent, RoomInfo, RoomMemberInfo, RoomRole, RoomServerMessage, PresenceStatus } from "@/lib/rooms/types";

export type CollabStatus = "idle" | "connecting" | "connected" | "reconnecting" | "closed";

export type ChatMessage = { id: string; at: string; authorId: string; author: string; text: string };

export type ActivityItem = { id: string; at: string; text: string; kind: "edit" | "packet" | "command" | "system" };

type PresenceReport = { activeDeviceId?: string | null; activity?: string };

type CollabState = {
  status: CollabStatus;
  code: string | null;
  room: RoomInfo | null;
  role: RoomRole | null;
  me: string | null;
  members: RoomMemberInfo[];
  messages: ChatMessage[];
  activity: ActivityItem[];
  revision: number;
  lastSeq: number;

  connect: (code: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  leave: (opts?: { notify?: boolean }) => Promise<void>;
  publish: (event: RoomEvent) => Promise<boolean>;
  sendChat: (text: string) => Promise<void>;
  reportPresence: (p: PresenceReport) => void;
  hostAction: (action: string, body?: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
};

// ───────────────────────── transport singleton ─────────────────────────────

let es: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let backoffMs = 800;
let disposed = true;
let activeCode: string | null = null;
let watchTimer: ReturnType<typeof setInterval> | null = null;
let lastMessageAt = 0;

let presenceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPresence: PresenceReport | null = null;

const STREAM_URL = (code: string, resync?: boolean) => `/api/rooms/${code}/stream${resync ? "?resync=1" : ""}`;

function clearTimers() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (watchTimer) clearInterval(watchTimer);
  if (presenceTimer) clearTimeout(presenceTimer);
  reconnectTimer = null;
  watchTimer = null;
  presenceTimer = null;
}

function disposeStream() {
  if (es) {
    es.onopen = null;
    es.onerror = null;
    es.onmessage = null;
    es.close();
    es = null;
  }
}

function disposeAll() {
  clearTimers();
  disposeStream();
  disposed = true;
  activeCode = null;
  pendingPresence = null;
}

function openStream(forceSync: boolean) {
  const code = useCollab.getState().code;
  if (!code) return;
  activeCode = code;
  es = new EventSource(STREAM_URL(code, forceSync));

  es.onopen = () => {
    useCollab.setState({ status: "connected" });
    backoffMs = 800;
  };

  es.onmessage = (e) => {
    lastMessageAt = Date.now();
    try {
      const msg = JSON.parse(e.data as string) as RoomServerMessage;
      handleServerMessage(msg);
    } catch {
      // non-JSON (e.g. heartbeat `: ping` is filtered by EventSource anyway)
    }
  };

  es.onerror = () => {
    useCollab.setState({ status: "reconnecting" });
    if (disposed) return;
    disposeStream();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (!disposed && activeCode === useCollab.getState().code) openStream(false);
    }, backoffMs);
    backoffMs = Math.min(backoffMs * 2, 10000);
  };
}

function forceFullResync() {
  // Server rejected an edit — drop local divergence and reload the server doc.
  disposeStream();
  if (activeCode === useCollab.getState().code) openStream(true);
}

function setupWatchdog() {
  if (watchTimer) clearInterval(watchTimer);
  watchTimer = setInterval(() => {
    const code = activeCode;
    if (!code || disposed) return;
    if (Date.now() - lastMessageAt > 45_000) {
      // Stale connection — reconnect.
      disposeStream();
      if (!disposed && activeCode === useCollab.getState().code) openStream(false);
    }
  }, 15_000);
}

// ───────────────────────── message handling ────────────────────────────────

function isWorkspaceEvent(e: RoomEvent): boolean {
  return (
    e.type === "DEVICE_CREATED" ||
    e.type === "DEVICE_MOVED" ||
    e.type === "DEVICE_DELETED" ||
    e.type === "DEVICE_UPDATED" ||
    e.type === "INTERFACE_UPDATED" ||
    e.type === "DEVICE_POWER_CHANGED" ||
    e.type === "CABLE_CREATED" ||
    e.type === "CABLE_REMOVED" ||
    e.type === "WORKSPACE_SYNC" ||
    e.type === "TOPOLOGY_RESET"
  );
}

function activityLabel(e: RoomEvent): string {
  const sim = useNetlab.getState().sim;
  const host = (id: string) => sim.devices.find((d) => d.id === id)?.config.hostname ?? "a device";
  switch (e.type) {
    case "DEVICE_CREATED": return `added ${e.device.config.hostname}`;
    case "DEVICE_MOVED": return `moved ${host(e.deviceId)}`;
    case "DEVICE_DELETED": return `removed ${host(e.deviceId)}`;
    case "DEVICE_UPDATED": return `edited ${host(e.deviceId)}`;
    case "INTERFACE_UPDATED": return `changed ${host(e.deviceId)} interface ${e.portId}`;
    case "DEVICE_POWER_CHANGED": return `${e.poweredOn ? "powered on" : "powered off"} ${host(e.deviceId)}`;
    case "CABLE_CREATED": return `cabled ${host(e.fromDevice)} to ${host(e.toDevice)}`;
    case "CABLE_REMOVED": return "removed a cable";
    case "WORKSPACE_SYNC": return "loaded a network";
    case "TOPOLOGY_RESET": return "reset the workspace";
    default: return "updated the workspace";
  }
}

function nowStamp(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addActivity(kind: ActivityItem["kind"], text: string) {
  const s = useCollab.getState();
  useCollab.setState({
    activity: [{ id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: nowStamp(), text, kind }, ...s.activity].slice(0, 40),
  });
}

function upsertMember(m: RoomMemberInfo) {
  const s = useCollab.getState();
  const exists = s.members.some((x) => x.userId === m.userId);
  useCollab.setState({ members: exists ? s.members.map((x) => (x.userId === m.userId ? m : x)) : [...s.members, m] });
}

function removeMember(userId: string) {
  useCollab.setState((s) => ({ members: s.members.filter((m) => m.userId !== userId) }));
}

function setMemberPresence(userId: string, status: PresenceStatus, activeDeviceId?: string | null, activity?: string) {
  useCollab.setState((s) => ({
    members: s.members.map((m) => (m.userId === userId ? { ...m, status, activeDeviceId: activeDeviceId ?? m.activeDeviceId, activity: activity ?? m.activity } : m)),
  }));
}

function handleEvent(event: RoomEvent, authorId: string, revision: number, seq: number) {
  const st = useCollab.getState();
  const net = useNetlab.getState();
  const me = st.me;
  const nameOf = (id: string) => st.members.find((m) => m.userId === id)?.name ?? (id === "system" ? "System" : "Someone");
  const who = (id: string) => (id === me ? "You" : nameOf(id));

  switch (event.type) {
    case "CHAT_MESSAGE": {
      useCollab.setState({
        messages: [
          ...st.messages,
          { id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: nowStamp(), authorId, author: who(authorId), text: event.text },
        ].slice(-80),
      });
      break;
    }
    case "PRESENCE": {
      setMemberPresence(authorId, event.status, event.activeDeviceId, event.activity);
      break;
    }
    case "USER_JOINED": {
      upsertMember(event.user);
      addActivity("system", `${event.user.name} joined`);
      break;
    }
    case "USER_LEFT": {
      setMemberPresence(authorId, "offline");
      addActivity("system", `${event.user.name} left`);
      break;
    }
    case "MEMBER_KICKED": {
      if (event.userId === me) {
        toast({ title: "You were removed from the room", variant: "error" });
        void useCollab.getState().leave({ notify: false });
      } else {
        removeMember(event.userId);
        addActivity("system", `${nameOf(event.userId)} was removed`);
      }
      break;
    }
    case "MEMBER_ROLE_CHANGED": {
      useCollab.setState((s) => ({ members: s.members.map((m) => (m.userId === event.userId ? { ...m, role: event.role } : m)) }));
      if (event.userId === me) useCollab.setState({ role: event.role });
      break;
    }
    case "ROOM_RENAMED": {
      useCollab.setState((s) => ({ room: s.room ? { ...s.room, name: event.name } : s.room }));
      break;
    }
    case "ROOM_LOCKED": {
      useCollab.setState((s) => ({ room: s.room ? { ...s.room, isLocked: event.isLocked } : s.room }));
      toast({
        title: event.isLocked ? "Room locked by host" : "Room unlocked",
        description: event.isLocked ? "Only the host can edit right now." : "Everyone with edit access can edit again.",
        variant: "info",
      });
      break;
    }
    case "WORKSPACE_SAVED": {
      addActivity("system", `Workspace saved by ${who(event.savedBy)}`);
      break;
    }
    case "COMMAND_EXECUTED": {
      const device = net.sim.devices.find((d) => d.id === event.deviceId)?.config.hostname ?? event.deviceId;
      addActivity("command", `${who(authorId)} ran "${event.command}" on ${device}`);
      break;
    }
    case "PACKET_STARTED": {
      // The receiver animates locally via netlab applyRemoteEvent; activity is
      // only recorded on completion to avoid duplicate "ping started" noise.
      net.applyRemoteEvent(event);
      break;
    }
    case "PACKET_COMPLETED": {
      addActivity("packet", `${who(authorId)} pinged ${event.target} — ${event.ok ? "replied" : "failed"}`);
      break;
    }
    default: {
      if (isWorkspaceEvent(event)) {
        net.applyRemoteEvent(event);
        addActivity("edit", `${who(authorId)} ${activityLabel(event)}`);
      }
      break;
    }
  }

  useCollab.setState({ lastSeq: seq, revision });
}

function handleServerMessage(msg: RoomServerMessage) {
  switch (msg.type) {
    case "ROOM_SYNC": {
      const s = useCollab.getState();
      useCollab.setState({
        room: msg.room,
        members: msg.members,
        revision: msg.revision,
        lastSeq: msg.seq,
        status: "connected",
      });
      const net = useNetlab.getState();
      const serverEmpty = msg.snapshot.devices.length === 0 && msg.snapshot.cables.length === 0;
      const localHas = net.sim.devices.length > 0;
      const freshRoom = msg.room.revision === 0;
      if (freshRoom && serverEmpty && localHas && s.role === "HOST") {
        // Host created the room on this device with a workspace already built —
        // seed the room with it rather than clobbering the local canvas.
        void useCollab.getState().publish({ type: "WORKSPACE_SYNC", snapshot: net.sim.snapshot });
      } else {
        net.applyRemoteEvent({ type: "WORKSPACE_SYNC", snapshot: msg.snapshot });
      }
      setupWatchdog();
      break;
    }
    case "REPLAY": {
      for (const entry of msg.events) {
        handleEvent(entry.event, entry.authorId, entry.revision, entry.seq);
      }
      break;
    }
    case "EVENT": {
      handleEvent(msg.event, msg.authorId, msg.revision, msg.seq);
      break;
    }
    case "ROOM_CLOSED": {
      toast({ title: "Room closed", description: "The host left or closed the session.", variant: "error" });
      void useCollab.getState().leave({ notify: false });
      break;
    }
  }
}

// ───────────────────────── store ───────────────────────────────────────────

export const useCollab = create<CollabState>((set, get) => ({
  status: "idle",
  code: null,
  room: null,
  role: null,
  me: null,
  members: [],
  messages: [],
  activity: [],
  revision: 0,
  lastSeq: 0,

  connect: async (code: string) => {
    try {
      const [joinRes, sessionRes] = await Promise.all([
        fetch(`/api/rooms/${code}/join`, { method: "POST" }),
        fetch("/api/auth/session"),
      ]);
      if (!joinRes.ok) {
        const body = (await joinRes.json().catch(() => null)) as { error?: string } | null;
        return { ok: false, error: body?.error ?? "Could not join this room" };
      }
      const joinBody = (await joinRes.json()) as { data?: { code: string; role: string; name: string } };
      const joined = joinBody.data ?? (joinBody as { code: string; role: string; name: string });
      const sessionBody = (await sessionRes.json()) as { data?: { user?: { id?: string } } };
      const me = sessionBody.data?.user?.id ?? null;

      disposeAll();
      disposed = false;
      activeCode = code;
      set({
        status: "connecting",
        code,
        role: (joined.role as RoomRole) ?? "VIEWER",
        me,
        room: { code, name: joined.name ?? code, hostId: "", kind: "networking", isLocked: false, revision: 0 },
        members: [],
        messages: [],
        activity: [],
        revision: 0,
        lastSeq: 0,
      });
      useNetlab.getState().setCollabEmitter((event) => {
        void get().publish(event);
      });
      openStream(false);
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server" };
    }
  },

  leave: async ({ notify = true } = {}) => {
    const { code } = get();
    disposeAll();
    if (notify && code) {
      try {
        await fetch(`/api/rooms/${code}/leave`, { method: "POST" });
      } catch {
        /* best effort */
      }
    }
    useNetlab.getState().setCollabEmitter(null);
    set({
      status: "idle",
      code: null,
      room: null,
      role: null,
      me: null,
      members: [],
      messages: [],
      activity: [],
      revision: 0,
      lastSeq: 0,
    });
  },

  publish: async (event) => {
    const { code } = get();
    if (!code) return false;
    try {
      const res = await fetch(`/api/rooms/${code}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({ title: "Change rejected", description: body?.error ?? "The server rejected that change.", variant: "error" });
        if (res.status === 403 || res.status === 410) forceFullResync();
        return false;
      }
      return true;
    } catch {
      toast({ title: "Offline", description: "Could not reach the server — reconnecting.", variant: "error" });
      return false;
    }
  },

  sendChat: async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await get().publish({ type: "CHAT_MESSAGE", text: trimmed });
  },

  reportPresence: (p) => {
    pendingPresence = { ...pendingPresence, ...p };
    if (presenceTimer) return;
    presenceTimer = setTimeout(() => {
      presenceTimer = null;
      const report = pendingPresence;
      pendingPresence = null;
      if (report) void get().publish({ type: "PRESENCE", status: "online", activeDeviceId: report.activeDeviceId, activity: report.activity });
    }, 2000);
  },

  hostAction: async (action, body) => {
    const { code } = get();
    if (!code) return { ok: false, error: "Not in a room" };
    try {
      const res = await fetch(`/api/rooms/${code}/host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        return { ok: false, error: data?.error ?? "Host action failed" };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server" };
    }
  },
}));
