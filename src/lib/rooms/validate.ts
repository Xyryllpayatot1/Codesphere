// ---------------------------------------------------------------------------
// Collaborative rooms — server-side event validation (zod).
//
// The client is never trusted. Every event a browser posts must pass this
// schema before it is sequenced and relayed. Because the simulation itself runs
// client-side, these schemas validate the *shape* of what the sim produces
// rather than re-implementing network semantics.
// ---------------------------------------------------------------------------

import { z } from "zod";
import type { RoomEvent, RoomRole } from "./types";

export const roleSchema = z.enum(["HOST", "COLLABORATOR", "VIEWER"]);

export const deviceTypeSchema = z.enum([
  "pc",
  "laptop",
  "server",
  "printer",
  "switch",
  "hub",
  "router",
  "wirelessRouter",
  "accessPoint",
  "firewall",
  "cloud",
]);

export const cableTypeSchema = z.enum(["copperStraight", "copperCrossover", "fiber", "serial", "console"]);

export const presenceStatusSchema = z.enum(["online", "idle", "offline"]);

const interfaceSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["ethernet", "fiber", "serial", "console", "wireless"]),
    status: z.enum(["up", "down"]),
    label: z.string().optional(),
    ip: z.string().optional(),
    mask: z.string().optional(),
    wan: z.boolean().optional(),
    description: z.string().optional(),
  })
  .passthrough();

const deviceConfigSchema = z
  .object({
    name: z.string(),
    hostname: z.string(),
    mac: z.string(),
    dhcp: z.boolean(),
    gateway: z.string().optional(),
    dns: z.string().optional(),
    wlan: z
      .object({
        ssid: z.string(),
        enabled: z.boolean(),
        password: z.string().optional(),
        encryption: z.enum(["none", "wpa2", "wpa3"]).optional(),
        channel: z.number().optional(),
        band: z.enum(["2.4", "5"]).optional(),
      })
      .passthrough()
      .optional(),
    interfaces: z.array(interfaceSchema).default([]),
  })
  .passthrough();

const deviceSchema = z
  .object({
    id: z.string().min(1).max(120),
    type: deviceTypeSchema,
    x: z.number().finite().min(0).max(50000),
    y: z.number().finite().min(0).max(50000),
    rotation: z.number().optional(),
    poweredOn: z.boolean().optional(),
    config: deviceConfigSchema,
    routes: z
      .array(z.object({ id: z.string(), network: z.string(), mask: z.string(), nextHop: z.string() }).passthrough())
      .default([]),
    dhcpPool: z
      .object({ start: z.string(), end: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    dnsRecords: z.array(z.object({ name: z.string(), ip: z.string() }).passthrough()).optional(),
    services: z.record(z.string(), z.boolean()).optional(),
  })
  .passthrough();

const snapshotSchema = z.object({
  version: z.literal(1),
  devices: z.array(deviceSchema).max(200),
  cables: z
    .array(
      z
        .object({
          id: z.string().min(1).max(120),
          type: cableTypeSchema,
          fromDevice: z.string(),
          fromPort: z.string(),
          toDevice: z.string(),
          toPort: z.string(),
        })
        .passthrough(),
    )
    .max(800),
  macTables: z.record(z.string(), z.record(z.string(), z.string())),
  startupConfigs: z.record(z.string(), z.unknown()),
  wirelessLinks: z.array(z.object({ id: z.string(), deviceId: z.string(), apId: z.string() }).passthrough()),
});

export const roomEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("DEVICE_CREATED"), device: deviceSchema }),
  z.object({ type: z.literal("DEVICE_MOVED"), deviceId: z.string().min(1).max(120), x: z.number().finite().min(0).max(50000), y: z.number().finite().min(0).max(50000) }),
  z.object({ type: z.literal("DEVICE_DELETED"), deviceId: z.string().min(1).max(120) }),
  z.object({
    type: z.literal("DEVICE_UPDATED"),
    deviceId: z.string().min(1).max(120),
    config: deviceConfigSchema.optional(),
    patch: z
      .object({
        hostname: z.string().optional(),
        dhcp: z.boolean().optional(),
        gateway: z.string().optional(),
        dns: z.string().optional(),
        wlan: z.unknown().optional(),
        rotation: z.number().optional(),
        routes: z.unknown().optional(),
        dhcpPool: z.unknown().optional(),
        dnsRecords: z.unknown().optional(),
        services: z.unknown().optional(),
      })
      .optional(),
  }),
  z.object({
    type: z.literal("INTERFACE_UPDATED"),
    deviceId: z.string().min(1).max(120),
    portId: z.string().min(1).max(120),
    ip: z.string().optional(),
    mask: z.string().optional(),
    status: z.enum(["up", "down"]).optional(),
  }),
  z.object({ type: z.literal("DEVICE_POWER_CHANGED"), deviceId: z.string().min(1).max(120), poweredOn: z.boolean() }),
  z.object({
    type: z.literal("CABLE_CREATED"),
    cableId: z.string().min(1).max(120),
    cableType: cableTypeSchema,
    fromDevice: z.string().min(1).max(120),
    fromPort: z.string().min(1).max(120),
    toDevice: z.string().min(1).max(120),
    toPort: z.string().min(1).max(120),
  }),
  z.object({ type: z.literal("CABLE_REMOVED"), cableId: z.string().min(1).max(120) }),
  z.object({ type: z.literal("WORKSPACE_SYNC"), snapshot: snapshotSchema }),
  z.object({ type: z.literal("TOPOLOGY_RESET"), snapshot: snapshotSchema }),
  z.object({ type: z.literal("COMMAND_EXECUTED"), deviceId: z.string().min(1).max(120), command: z.string().max(200), ok: z.boolean(), summary: z.string().max(500) }),
  z.object({ type: z.literal("PACKET_STARTED"), packetId: z.string().min(1).max(120), sourceId: z.string().min(1).max(120), target: z.string().max(120), packetType: z.string().max(20) }),
  z.object({ type: z.literal("PACKET_COMPLETED"), packetId: z.string().min(1).max(120), sourceId: z.string().min(1).max(120), target: z.string().max(120), packetType: z.string().max(20), ok: z.boolean(), summary: z.string().max(500) }),
  z.object({ type: z.literal("CHAT_MESSAGE"), text: z.string().trim().min(1).max(500) }),
  z.object({
    type: z.literal("PRESENCE"),
    status: presenceStatusSchema,
    activeDeviceId: z.string().nullable().optional(),
    activity: z.string().max(120).nullable().optional(),
  }),
]);

export type ParsedEvent =
  | { ok: true; event: RoomEvent }
  | { ok: false; error: string };

export function parseRoomEvent(input: unknown): ParsedEvent {
  const res = roomEventSchema.safeParse(input);
  if (res.success) return { ok: true, event: res.data as unknown as RoomEvent };
  return { ok: false, error: res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

export type ParsedRole = { ok: true; role: RoomRole } | { ok: false; error: string };

export function parseRole(input: unknown): ParsedRole {
  const res = roleSchema.safeParse(input);
  if (res.success) return { ok: true, role: res.data };
  return { ok: false, error: "Invalid role" };
}
