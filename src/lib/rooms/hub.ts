// ---------------------------------------------------------------------------
// RoomHub — the in-memory realtime coordinator.
//
// NOT a simulation engine. The browser runs every simulation locally; this hub
// only: (1) maintains the shared workspace document by applying lightweight
// CRUD patches, (2) assigns a global sequence number per room so every client
// converges on the same order, (3) broadcasts to SSE subscribers, (4) keeps a
// bounded event log so reconnecting clients can replay missed events, and
// (5) schedules debounced database snapshots. Nothing here writes to the
// database on every event — only room lifecycle + debounced snapshots do.
//
// Multi-instance note: this singleton lives in the Next.js Node process. In v1
// that is exactly one server (Render `next start`), so the room bus is shared.
// Moving to a dedicated realtime service later only replaces this module.
// ---------------------------------------------------------------------------

import "server-only";

import { getRoomByCode, loadLatestSnapshot, saveSnapshot } from "./service";
import type { SimSnapshot } from "@/lib/net/types";
import type { RoomEvent, RoomMemberInfo, RoomServerMessage, RoomInfo, RoomRole } from "./types";
import { REVISION_EVENT_TYPES } from "./types";

export type Subscriber = {
  userId: string;
  send: (msg: RoomServerMessage) => void;
};

type LogEntry = { seq: number; revision: number; authorId: string; event: RoomEvent };

const LOG_LIMIT = 600;
const AUTOSAVE_MS = 8000;

function clone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
}

export class RoomSession {
  code: string;
  roomId: string;
  name: string;
  hostId: string;
  kind: string;
  isLocked: boolean;
  revision: number;
  doc: SimSnapshot;
  seq = 0;
  log: LogEntry[] = [];
  members = new Map<string, RoomMemberInfo>();
  private subscribers = new Map<string, Set<Subscriber>>();
  private autosaveTimer: NodeJS.Timeout | null = null;
  closed = false;

  constructor(input: { code: string; roomId: string; name: string; hostId: string; kind: string; isLocked: boolean; revision: number; doc: SimSnapshot }) {
    this.code = input.code;
    this.roomId = input.roomId;
    this.name = input.name;
    this.hostId = input.hostId;
    this.kind = input.kind;
    this.isLocked = input.isLocked;
    this.revision = input.revision;
    this.doc = input.doc;
    this.seq = 0;
  }

  roomInfo(): RoomInfo {
    return { code: this.code, name: this.name, hostId: this.hostId, kind: this.kind, isLocked: this.isLocked, revision: this.revision };
  }

  memberList(): RoomMemberInfo[] {
    return [...this.members.values()];
  }

  subscriberCount(userId: string): number {
    return this.subscribers.get(userId)?.size ?? 0;
  }

  // ── connection / presence ────────────────────────────────────────────────

  connect(member: RoomMemberInfo, sub: Subscriber) {
    if (this.closed) return false;
    let justJoined = false;
    if (!this.members.has(member.userId)) {
      this.members.set(member.userId, { ...member, status: "online" });
      justJoined = true;
    } else {
      this.members.set(member.userId, { ...member, status: "online" });
    }
    if (!this.subscribers.has(member.userId)) this.subscribers.set(member.userId, new Set());
    this.subscribers.get(member.userId)!.add(sub);
    if (justJoined) {
      this.broadcast({ type: "EVENT", seq: this.seq, revision: this.revision, authorId: member.userId, event: { type: "USER_JOINED", user: this.members.get(member.userId)! } });
    } else {
      this.broadcast({ type: "EVENT", seq: this.seq, revision: this.revision, authorId: member.userId, event: { type: "PRESENCE", status: "online", activeDeviceId: this.members.get(member.userId)?.activeDeviceId ?? null, activity: this.members.get(member.userId)?.activity } });
    }
    return true;
  }

  disconnect(userId: string, sub: Subscriber) {
    const subs = this.subscribers.get(userId);
    if (subs) {
      subs.delete(sub);
      if (subs.size === 0) this.subscribers.delete(userId);
    }
    if (this.members.has(userId) && this.subscriberCount(userId) === 0) {
      const member = this.members.get(userId)!;
      member.status = "offline";
      this.broadcast({ type: "EVENT", seq: this.seq, revision: this.revision, authorId: userId, event: { type: "PRESENCE", status: "offline", activeDeviceId: member.activeDeviceId ?? null, activity: member.activity } });
    }
  }

  // ── publishing ───────────────────────────────────────────────────────────

  publish(authorId: string, event: RoomEvent): { seq: number; revision: number } | null {
    if (this.closed) return null;
    this.seq += 1;
    const seq = this.seq;
    let revision = this.revision;
    if (REVISION_EVENT_TYPES.has(event.type)) {
      revision = ++this.revision;
      this.applyToDoc(event);
      this.scheduleAutosave();
    }
    this.log.push({ seq, revision, authorId, event });
    if (this.log.length > LOG_LIMIT) this.log.splice(0, this.log.length - LOG_LIMIT);
    this.broadcast({ type: "EVENT", seq, revision, authorId, event });
    return { seq, revision };
  }

  /** Replays events after `lastSeq`, or an empty list when nothing is missing. */
  replaySince(sub: Subscriber, lastSeq: number) {
    const fromIndex = this.log.findIndex((l) => l.seq > lastSeq);
    if (fromIndex === -1) {
      sub.send({ type: "REPLAY", events: [] });
      return;
    }
    sub.send({ type: "REPLAY", events: this.log.slice(fromIndex) });
  }

  syncMessage(): RoomServerMessage {
    return {
      type: "ROOM_SYNC",
      seq: this.seq,
      revision: this.revision,
      snapshot: clone(this.doc),
      room: this.roomInfo(),
      members: this.memberList(),
    };
  }

  // ── host controls ────────────────────────────────────────────────────────

  rename(name: string) {
    this.name = name;
    this.broadcast({ type: "EVENT", seq: this.seq, revision: this.revision, authorId: this.hostId, event: { type: "ROOM_RENAMED", name } });
  }

  setLocked(isLocked: boolean) {
    this.isLocked = isLocked;
    this.broadcast({ type: "EVENT", seq: this.seq, revision: this.revision, authorId: this.hostId, event: { type: "ROOM_LOCKED", isLocked } });
  }

  kick(userId: string) {
    const member = this.members.get(userId);
    this.members.delete(userId);
    const subs = this.subscribers.get(userId);
    if (subs) {
      for (const s of subs) s.send({ type: "ROOM_CLOSED" });
      this.subscribers.delete(userId);
    }
    if (member) {
      this.broadcast({ type: "EVENT", seq: this.seq, revision: this.revision, authorId: this.hostId, event: { type: "USER_LEFT", user: { ...member, status: "offline" } } });
      this.broadcast({ type: "EVENT", seq: this.seq, revision: this.revision, authorId: this.hostId, event: { type: "MEMBER_KICKED", userId } });
    }
  }

  /** Graceful leave: notify everyone but do not terminate the member's streams. */
  removeMember(userId: string) {
    const member = this.members.get(userId);
    if (!member) return;
    this.members.delete(userId);
    this.broadcast({ type: "EVENT", seq: this.seq, revision: this.revision, authorId: userId, event: { type: "USER_LEFT", user: { ...member, status: "offline" } } });
  }

  setRole(userId: string, role: RoomRole) {
    const member = this.members.get(userId);
    if (member) {
      member.role = role;
      this.members.set(userId, member);
    }
    this.broadcast({ type: "EVENT", seq: this.seq, revision: this.revision, authorId: this.hostId, event: { type: "MEMBER_ROLE_CHANGED", userId, role } });
  }

  /** Synchronously persist the current document to the database. */
  async save(reason: "manual" | "autosave" | "close" | "reset", savedBy?: string) {
    if (this.closed) return;
    await saveSnapshot(this.roomId, this.revision, clone(this.doc), reason, savedBy);
    this.broadcast({ type: "EVENT", seq: this.seq, revision: this.revision, authorId: savedBy ?? this.hostId, event: { type: "WORKSPACE_SAVED", savedBy: savedBy ?? this.hostId } });
  }

  async close() {
    if (this.closed) return;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    await this.save("close");
    this.closed = true;
    for (const subs of this.subscribers.values()) {
      for (const s of subs) s.send({ type: "ROOM_CLOSED" });
    }
    this.subscribers.clear();
  }

  private scheduleAutosave() {
    if (this.autosaveTimer) return;
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      void this.save("autosave").catch(() => {});
    }, AUTOSAVE_MS);
  }

  private broadcast(msg: RoomServerMessage) {
    for (const subs of this.subscribers.values()) {
      for (const s of subs) {
        try {
          s.send(msg);
        } catch {
          // subscriber stream already gone — drop
        }
      }
    }
  }

  // ── document patching (pure data, NO simulation) ─────────────────────────

  private applyToDoc(e: RoomEvent) {
    const d = this.doc;
    switch (e.type) {
      case "DEVICE_CREATED": {
        if (!d.devices.some((x) => x.id === e.device.id)) d.devices.push(clone(e.device));
        break;
      }
      case "DEVICE_MOVED": {
        const dev = d.devices.find((x) => x.id === e.deviceId);
        if (dev) {
          dev.x = Math.max(0, e.x);
          dev.y = Math.max(0, e.y);
        }
        break;
      }
      case "DEVICE_DELETED": {
        d.devices = d.devices.filter((x) => x.id !== e.deviceId);
        d.cables = d.cables.filter((c) => c.fromDevice !== e.deviceId && c.toDevice !== e.deviceId);
        delete d.startupConfigs[e.deviceId];
        d.wirelessLinks = d.wirelessLinks.filter((l) => l.deviceId !== e.deviceId && l.apId !== e.deviceId);
        for (const key of Object.keys(d.macTables)) {
          d.macTables[key] = {};
        }
        break;
      }
      case "DEVICE_UPDATED": {
        const dev = d.devices.find((x) => x.id === e.deviceId);
        if (!dev) break;
        if (e.config) dev.config = clone(e.config);
        if (e.patch) {
          if (e.patch.hostname !== undefined) {
            dev.config.hostname = e.patch.hostname;
            dev.config.name = e.patch.hostname;
          }
          if (e.patch.dhcp !== undefined) dev.config.dhcp = e.patch.dhcp;
          if (e.patch.gateway !== undefined) dev.config.gateway = e.patch.gateway;
          if (e.patch.dns !== undefined) dev.config.dns = e.patch.dns;
          if (e.patch.wlan !== undefined) dev.config.wlan = e.patch.wlan;
          if (e.patch.rotation !== undefined) dev.rotation = e.patch.rotation;
          if (e.patch.routes !== undefined) dev.routes = e.patch.routes;
          if (e.patch.dhcpPool !== undefined) dev.dhcpPool = e.patch.dhcpPool;
          if (e.patch.dnsRecords !== undefined) dev.dnsRecords = e.patch.dnsRecords;
          if (e.patch.services !== undefined) dev.services = e.patch.services;
        }
        break;
      }
      case "INTERFACE_UPDATED": {
        const dev = d.devices.find((x) => x.id === e.deviceId);
        if (!dev) break;
        const iface = dev.config.interfaces.find((i) => i.id === e.portId);
        if (!iface) break;
        if (e.ip !== undefined) iface.ip = e.ip || undefined;
        if (e.mask !== undefined) iface.mask = e.mask || undefined;
        if (e.status !== undefined) iface.status = e.status;
        break;
      }
      case "DEVICE_POWER_CHANGED": {
        const dev = d.devices.find((x) => x.id === e.deviceId);
        if (dev) dev.poweredOn = e.poweredOn;
        break;
      }
      case "CABLE_CREATED": {
        if (!d.cables.some((c) => c.id === e.cableId)) {
          d.cables.push({ id: e.cableId, type: e.cableType, fromDevice: e.fromDevice, fromPort: e.fromPort, toDevice: e.toDevice, toPort: e.toPort });
        }
        break;
      }
      case "CABLE_REMOVED": {
        d.cables = d.cables.filter((c) => c.id !== e.cableId);
        break;
      }
      case "WORKSPACE_SYNC":
      case "TOPOLOGY_RESET": {
        this.doc = clone(e.snapshot);
        this.revision = this.revision; // revision already bumped by caller path
        break;
      }
      default:
        break;
    }
  }
}

const globalRoomHub = globalThis as unknown as { __codesphereRoomHub?: RoomHub };

export class RoomHub {
  private rooms = new Map<string, RoomSession>();

  /** Returns the live session, lazily restoring it from the last DB snapshot. */
  async session(code: string): Promise<RoomSession | null> {
    const existing = this.rooms.get(code);
    if (existing) return existing;
    const room = await getRoomByCode(code);
    if (!room || room.status !== "ACTIVE") return null;
    const latest = await loadLatestSnapshot(room.id);
    const session = new RoomSession({
      code: room.code,
      roomId: room.id,
      name: room.name,
      hostId: room.hostId,
      kind: room.kind,
      isLocked: room.isLocked,
      revision: latest?.revision ?? room.revision,
      doc: latest?.snapshot ?? emptyDoc(),
    });
    this.rooms.set(code, session);
    return session;
  }

  /** Registers a freshly created (or restored) room in memory. */
  register(input: { code: string; roomId: string; name: string; hostId: string; kind: string; isLocked: boolean; revision: number }) {
    let s = this.rooms.get(input.code);
    if (!s) {
      s = new RoomSession({ ...input, doc: emptyDoc() });
      this.rooms.set(input.code, s);
    }
    return s;
  }

  drop(code: string) {
    this.rooms.delete(code);
  }
}

function emptyDoc(): SimSnapshot {
  return { version: 1, devices: [], cables: [], macTables: {}, startupConfigs: {}, wirelessLinks: [] };
}

export const roomHub: RoomHub = globalRoomHub.__codesphereRoomHub ?? (globalRoomHub.__codesphereRoomHub = new RoomHub());
