// ---------------------------------------------------------------------------
// Collaborative rooms — shared types (safe to import on the client AND server).
// The realtime bus is in-memory; these are the small, validated events that
// travel over SSE (server→client) and POST (client→server).
// ---------------------------------------------------------------------------

import type { CableType, Device, SimSnapshot } from "@/lib/net/types";

export const ROOM_ROLES = {
  HOST: "HOST",
  COLLABORATOR: "COLLABORATOR",
  VIEWER: "VIEWER",
} as const;

export type RoomRole = (typeof ROOM_ROLES)[keyof typeof ROOM_ROLES];

export type PresenceStatus = "online" | "idle" | "offline";

export type RoomMemberInfo = {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  role: RoomRole;
  status: PresenceStatus;
  activeDeviceId?: string | null;
  activity?: string;
};

export type RoomInfo = {
  code: string;
  name: string;
  hostId: string;
  kind: string;
  isLocked: boolean;
  revision: number;
};

// ─────────────────────────── Workspace events ───────────────────────────────

export type DeviceUpdatePatch = {
  hostname?: string;
  dhcp?: boolean;
  gateway?: string;
  dns?: string;
  wlan?: Device["config"]["wlan"];
  rotation?: number;
  routes?: Device["routes"];
  dhcpPool?: Device["dhcpPool"];
  dnsRecords?: Device["dnsRecords"];
  services?: Device["services"];
};

export type RoomEvent =
  // workspace
  | { type: "DEVICE_CREATED"; device: Device }
  | { type: "DEVICE_MOVED"; deviceId: string; x: number; y: number }
  | { type: "DEVICE_DELETED"; deviceId: string }
  | { type: "DEVICE_UPDATED"; deviceId: string; config?: Device["config"]; patch?: DeviceUpdatePatch }
  | { type: "INTERFACE_UPDATED"; deviceId: string; portId: string; ip?: string; mask?: string; status?: "up" | "down" }
  | { type: "DEVICE_POWER_CHANGED"; deviceId: string; poweredOn: boolean }
  | { type: "CABLE_CREATED"; cableId: string; cableType: CableType; fromDevice: string; fromPort: string; toDevice: string; toPort: string }
  | { type: "CABLE_REMOVED"; cableId: string }
  // full-document sync — undo, import, load, reset (host-only for reset)
  | { type: "WORKSPACE_SYNC"; snapshot: SimSnapshot }
  | { type: "TOPOLOGY_RESET"; snapshot: SimSnapshot }
  // activity visibility
  | { type: "COMMAND_EXECUTED"; deviceId: string; command: string; ok: boolean; summary: string }
  | { type: "PACKET_STARTED"; packetId: string; sourceId: string; target: string; packetType: string }
  | { type: "PACKET_COMPLETED"; packetId: string; sourceId: string; target: string; packetType: string; ok: boolean; summary: string }
  // chat
  | { type: "CHAT_MESSAGE"; text: string }
  // presence / active object (throttled)
  | { type: "PRESENCE"; status: PresenceStatus; activeDeviceId?: string | null; activity?: string }
  // membership
  | { type: "USER_JOINED"; user: RoomMemberInfo }
  | { type: "USER_LEFT"; user: RoomMemberInfo }
  // host controls
  | { type: "ROOM_RENAMED"; name: string }
  | { type: "ROOM_LOCKED"; isLocked: boolean }
  | { type: "MEMBER_KICKED"; userId: string }
  | { type: "MEMBER_ROLE_CHANGED"; userId: string; role: RoomRole }
  | { type: "WORKSPACE_SAVED"; savedBy: string };

// Envelope delivered over SSE.
export type RoomServerMessage =
  | { type: "ROOM_SYNC"; seq: number; revision: number; snapshot: SimSnapshot; room: RoomInfo; members: RoomMemberInfo[] }
  | { type: "EVENT"; seq: number; revision: number; authorId: string; event: RoomEvent }
  | { type: "REPLAY"; events: { seq: number; revision: number; authorId: string; event: RoomEvent }[] }
  | { type: "ROOM_CLOSED" }
  | { type: "ERROR"; message: string };

// What a client sends when it wants to re-baseline (gap detected).
export type ResyncRequest = { type: "RESYNC" };

/** Workspace-mutating event types — these bump the room revision. */
export const REVISION_EVENT_TYPES = new Set<string>([
  "DEVICE_CREATED",
  "DEVICE_MOVED",
  "DEVICE_DELETED",
  "DEVICE_UPDATED",
  "INTERFACE_UPDATED",
  "DEVICE_POWER_CHANGED",
  "CABLE_CREATED",
  "CABLE_REMOVED",
  "WORKSPACE_SYNC",
  "TOPOLOGY_RESET",
]);
