// ---------------------------------------------------------------------------
// Networking Lab — core data model.
//
// The whole simulator is pure TypeScript (no React, no I/O) so the SAME engine
// runs on the client (live canvas) and on the server (mission re-validation).
// Adding a device kind or protocol later only touches this model + the engine
// functions — the UI is data-driven off DEVICE_TYPES.
// ---------------------------------------------------------------------------

export type DeviceType =
  | "pc"
  | "laptop"
  | "server"
  | "printer"
  | "switch"
  | "hub"
  | "router"
  | "wirelessRouter"
  | "accessPoint"
  | "firewall"
  | "cloud";

/** Ports carry a media kind; cables only mate with matching kinds. */
export type PortKind = "ethernet" | "fiber" | "serial" | "console" | "wireless";

export type PortStatus = "up" | "down";

export type InterfaceConfig = {
  /** Stable port id within a device, e.g. "eth0", "gig0/0", "console0". */
  id: string;
  kind: PortKind;
  status: PortStatus;
  /** Router-facing label, e.g. "GigabitEthernet0/0". */
  label?: string;
  /** L3 configuration — set on routers/firewalls per interface. */
  ip?: string;
  mask?: string;
  /** Marks the WAN/uplink interface (wireless routers); kept off the LAN bridge. */
  wan?: boolean;
  /** Description shown in `show interfaces` / config panel. */
  description?: string;
  /** Access VLAN for switch ports (default 1). */
  accessVlan?: number;
  /** Marks a switch port as a trunk — it carries every VLAN. */
  trunk?: boolean;
};

/** A VLAN in a switch's VLAN database. The default switch has VLAN 1. */
export type VlanDef = { id: number; name: string };

/** CLI session state that is persisted on the device for mission verification
 *  (the current privilege mode lives in the terminal session instead). */
export type DeviceCliState = {
  /** The last CLI commands executed on this device (capped, in order). */
  commands: string[];
};

export type WlanConfig = {
  ssid: string;
  enabled: boolean;
  /** Shared passphrase. When set on the AP, a client must use the same one. */
  password?: string;
  encryption?: "none" | "wpa2" | "wpa3";
  /** Wi-Fi channel (1–13 for 2.4GHz, 36–165 for 5GHz). */
  channel?: number;
  band?: "2.4" | "5";
};

/** Software services a server can host. Every switch here affects the sim. */
export type ServerServiceKey = "http" | "https" | "dns" | "dhcp" | "ftp" | "smtp" | "pop3" | "ssh" | "fileServer" | "database";

export type ServerServices = Record<ServerServiceKey, boolean>;

export const SERVER_SERVICE_KEYS: ServerServiceKey[] = [
  "http",
  "https",
  "dns",
  "dhcp",
  "ftp",
  "smtp",
  "pop3",
  "ssh",
  "fileServer",
  "database",
];

export type DeviceConfig = {
  name: string;
  hostname: string;
  mac: string;
  /** End devices (PC/laptop/server/printer) request an address from DHCP. */
  dhcp: boolean;
  gateway?: string;
  dns?: string;
  wlan?: WlanConfig;
  interfaces: InterfaceConfig[];
};

export type StaticRoute = {
  id: string;
  network: string;
  mask: string;
  /** Next-hop router IP. Empty string means a default route (0.0.0.0/0). */
  nextHop: string;
};

export type Device = {
  id: string;
  type: DeviceType;
  x: number;
  y: number;
  /** Visual rotation in degrees (0 / 90 / 180 / 270). Moves the port anchor. */
  rotation?: number;
  /** Device power state — a powered-off device cannot send, receive or forward. */
  poweredOn?: boolean;
  config: DeviceConfig;
  /** Static routes — routers/firewalls only. */
  routes: StaticRoute[];
  /** Servers can offer DHCP pools and DNS records. */
  dhcpPool?: { start: string; end: string } | null;
  dnsRecords?: { name: string; ip: string }[];
  /** Running software services (servers/cloud). Missing = every service on. */
  services?: ServerServices;
  /** VLAN database for switches (id → name). Defaults to VLAN 1 only. */
  vlans?: VlanDef[];
  /** Last CLI commands executed on this device (for NOS mission checks). */
  cli?: DeviceCliState;
};

export type CableType = "copperStraight" | "copperCrossover" | "fiber" | "serial" | "console";

export type CableStatus = "up" | "connecting" | "down" | "error";

export type Cable = {
  id: string;
  type: CableType;
  fromDevice: string;
  fromPort: string;
  toDevice: string;
  toPort: string;
};

export type PacketType = "icmp" | "http" | "dns" | "dhcp" | "ftp";

export type TraceStep = {
  /** Device id the packet currently sits on. */
  deviceId: string;
  deviceLabel: string;
  /** Cable id crossed (undefined for in-device processing). */
  cableId?: string;
  layer: "L1" | "L2" | "L3" | "L4" | "L7";
  /** Short action title, e.g. "ARP request". */
  action: string;
  /** Human-readable explanation of WHY this step happens. */
  detail: string;
  status?: "ok" | "warn" | "fail";
};

/**
 * A structured, engine-derived explanation of WHY a packet failed. The CLI, the
 * packet lab, the canvas highlight and the teaching notes all read from this so
 * the same reason is shown everywhere (single source of truth).
 */
export type PingFault = {
  /** Stable machine key, e.g. "no-gateway". */
  code: string;
  /** Short one-liner, e.g. "No default gateway configured." */
  reason: string;
  /** What happened, in plain language. */
  what: string;
  /** Why it happened, in plain language. */
  why: string;
  /** How to fix it, in plain language. */
  fix: string;
  /** Devices the canvas should highlight as responsible. */
  deviceIds: string[];
  /** Cables the canvas should highlight as broken/disconnected. */
  cableIds: string[];
  /** Interfaces the canvas should highlight as down/incorrect. */
  ifaceIds: string[];
};

export type TraceResult = {
  ok: boolean;
  type: PacketType;
  sourceId: string;
  target: string;
  steps: TraceStep[];
  /** Final one-line human message ("Reply from 192.168.1.2: bytes=32"). */
  summary: string;
  /** Why it failed (when !ok) — used by the mission panel too. */
  error?: string;
  /** Short failure reason (when !ok), e.g. "No default gateway configured." */
  reason?: string;
  /** Structured failure explanation (when !ok) for highlighting + teaching. */
  fault?: PingFault;
};

export type SimSnapshot = {
  version: 1;
  devices: Device[];
  cables: Cable[];
  /** switchId -> { mac -> portId } — the MAC learning tables. */
  macTables: Record<string, Record<string, string>>;
  /** routerId -> saved config snapshot for `show startup-config`. */
  startupConfigs: Record<string, { hostname: string; interfaces: InterfaceConfig[]; routes: StaticRoute[] }>;
  /** Laptop to access point associations, recomputed whenever devices change. */
  wirelessLinks: WirelessLink[];
};

export const CABLE_TYPES: Record<CableType, { label: string; short: string; friendly: string; purpose: string; color: string; portKind: PortKind; note: string }> = {
  copperStraight: {
    label: "Copper Straight-Through",
    short: "Copper",
    friendly: "Straight-Through",
    purpose: "Connects two different device types — like a PC to a switch.",
    color: "#f59e0b",
    portKind: "ethernet",
    note: "Straight-through cables connect different device kinds (PC → switch, router → switch).",
  },
  copperCrossover: {
    label: "Copper Crossover",
    short: "Crossover",
    friendly: "Crossover",
    purpose: "Connects two of the same type — like a switch to a switch or a PC to a PC.",
    color: "#f97316",
    portKind: "ethernet",
    note: "Crossover cables connect two similar devices directly (PC → PC, switch → switch, router → router).",
  },
  fiber: {
    label: "Fiber Optic",
    short: "Fiber",
    friendly: "Fiber",
    purpose: "Fast, long-distance links between switches, routers, servers and the cloud.",
    color: "#38bdf8",
    portKind: "fiber",
    note: "Fiber uses light pulses and is used for fast, long-distance links between switches and routers.",
  },
  serial: {
    label: "Serial",
    short: "Serial",
    friendly: "Serial (WAN)",
    purpose: "Connects two routers for a wide-area (WAN) link — the classic router-to-router cable.",
    color: "#a78bfa",
    portKind: "serial",
    note: "Serial cables link routers over long distances — the classic WAN connection.",
  },
  console: {
    label: "Console",
    short: "Console",
    friendly: "Console",
    purpose: "Links a PC to a router or switch so you can manage it from the command line.",
    color: "#34d399",
    portKind: "console",
    note: "A console cable connects a PC to a router/switch so you can configure it through the CLI.",
  },
} as const;

/** Wireless "associations" (laptop to access point) are drawn as dashed links. */
export type WirelessLink = {
  id: string;
  deviceId: string;
  apId: string;
};

export const DEVICE_SIZE = { width: 84, height: 64 } as const;

export const PORT_ANCHORS: Record<PortKind, { x: number; y: number }> = {
  ethernet: { x: 0.5, y: 1 },
  fiber: { x: 0.5, y: 1 },
  serial: { x: 0.5, y: 1 },
  console: { x: 0.5, y: 1 },
  wireless: { x: 0.5, y: 1 },
};

/**
 * World-space attachment point for a port on a device, honoring rotation.
 * Ports live at the bottom-center by default; rotating the device moves the
 * anchor around the box (90° → left, 180° → top, 270° → right).
 */
export function deviceAnchor(d: Device, kind: PortKind): { x: number; y: number } {
  const base = PORT_ANCHORS[kind] ?? PORT_ANCHORS.ethernet;
  const rot = (d.rotation ?? 0) % 360;
  if (rot === 0) return { x: base.x * DEVICE_SIZE.width, y: base.y * DEVICE_SIZE.height };
  const cx = 0.5;
  const cy = 0.5;
  const px = base.x - cx;
  const py = base.y - cy;
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = px * cos - py * sin;
  const ry = px * sin + py * cos;
  return { x: (rx + cx) * DEVICE_SIZE.width, y: (ry + cy) * DEVICE_SIZE.height };
}

// ---------------------------------------------------------------------------
// Live observation — packet counters, the network timeline, and clickable
// packet inspection. Runtime only (recomputed per run), never persisted.
// ---------------------------------------------------------------------------

export type ProtocolName = "ARP" | "ICMP" | "DHCP" | "DNS" | "HTTP" | "HTTPS" | "FTP" | "SMTP" | "POP3" | "SSH" | "TCP" | "UDP";

export type TimelineEvent = {
  id: string;
  at: number;
  protocol: ProtocolName;
  deviceId: string;
  deviceLabel: string;
  action: string;
  detail: string;
  ok: boolean;
};

export type PortStats = {
  rxPkts: number;
  txPkts: number;
  rxBytes: number;
  txBytes: number;
  errors: number;
};

export type DeviceStats = {
  tx: number;
  rx: number;
  dropped: number;
  byProtocol: Partial<Record<ProtocolName, number>>;
  ports: Record<string, PortStats>;
};

/** One row of a packet's header view, with a beginner-friendly explanation. */
export type PacketHeaderField = { name: string; value: string; explain: string };

export type PacketView = {
  protocol: ProtocolName;
  /** OSI layer of the step the packet is shown for. */
  layer: string;
  action: string;
  detail: string;
  bytes: number;
  checksum: string;
  /** Ethernet frame header (always present). */
  ethernet: {
    srcMac: string;
    dstMac: string;
    etherType: string;
  };
  /** IPv4 header — present from the Network layer up. */
  ip?: {
    srcIp: string;
    dstIp: string;
    ttl: number;
    protocol: string;
  };
  /** Transport header — present on L4/L7 steps. */
  l4?: {
    protocol: string;
    srcPort: number;
    dstPort: number;
  };
  payload: string;
  /** Flattened field list with explanations, for the inspector UI. */
  fields: PacketHeaderField[];
};
