import { DEVICE_TYPES } from "./devices";
import { formatIp, intToIp, ipToInt, isSameNetwork, maskToBits, networkOf, parseIp } from "./ip";
import { cableStatus } from "./cables";
import { serviceOn } from "./services";
import type { Cable, Device, PacketType, PingFault, TraceResult, TraceStep, WirelessLink } from "./types";

export type NetSnapshot = {
  devices: Device[];
  cables: Cable[];
  macTables: Record<string, Record<string, string>>;
  wirelessLinks: WirelessLink[];
};

export type PacketRun = {
  sourceId: string;
  target: string;
  type: PacketType;
};

const BRIDGE_TYPES = new Set(["switch", "hub", "accessPoint"]);

const isBridge = (d: Device) => BRIDGE_TYPES.has(d.type);
const isRouter = (d: Device) => d.type === "router" || d.type === "wirelessRouter" || d.type === "firewall";
export const WIFI_PORT = "radio0";
export const isPoweredOff = (d: Device | undefined) => d?.poweredOn === false;

// ---------------------------------------------------------------------------
// Wireless association.
// ---------------------------------------------------------------------------

export function computeWirelessLinks(devices: Device[]): WirelessLink[] {
  const links: WirelessLink[] = [];
  for (const laptop of devices) {
    if (laptop.type !== "laptop") continue;
    if (isPoweredOff(laptop)) continue;
    const wlan = laptop.config.wlan;
    if (!wlan || !wlan.enabled || !wlan.ssid) continue;
    for (const ap of devices) {
      if (ap.type !== "accessPoint" && ap.type !== "wirelessRouter") continue;
      if (isPoweredOff(ap)) continue;
      const apWlan = ap.config.wlan;
      if (!apWlan || !apWlan.enabled || apWlan.ssid !== wlan.ssid) continue;
      // WPA — both sides must share the same passphrase and encryption.
      if (apWlan.password && apWlan.password.length > 0 && wlan.password !== apWlan.password) continue;
      if (!apWlan.password && wlan.encryption && wlan.encryption !== "none") continue;
      links.push({ id: `${laptop.id}->${ap.id}`, deviceId: laptop.id, apId: ap.id });
    }
  }
  return links;
}

/** The L2 node a device currently uses to talk (wireless radio when associated). */
export function deviceActivePort(devices: Device[], deviceId: string, wirelessLinks: WirelessLink[]): string | null {
  const d = devices.find((x) => x.id === deviceId);
  if (!d) return null;
  if (isPoweredOff(d)) return null;
  if (wirelessLinks.some((l) => l.deviceId === deviceId)) return WIFI_PORT;
  const upPort = d.config.interfaces.find((i) => i.status === "up");
  return upPort ? upPort.id : null;
}

// ---------------------------------------------------------------------------
// Union-find over (device, port) nodes. Bridges merge all their ports into one
// L2 segment; routers keep one node per interface so they act as L3 boundaries.
// ---------------------------------------------------------------------------

export const portKey = (deviceId: string, portId: string) => `${deviceId}::${portId}`;
export const radioKey = (deviceId: string) => portKey(deviceId, WIFI_PORT);

export function unionFind(devices: Device[], cables: Cable[], wirelessLinks: WirelessLink[]) {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!;
    while (parent.has(x) && parent.get(x) !== x) {
      const next = parent.get(x)!;
      parent.set(x, root);
      x = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  for (const d of devices) {
    const portIds = [...d.config.interfaces.map((i) => i.id)];
    if (d.type === "accessPoint" || d.type === "wirelessRouter") portIds.push(WIFI_PORT);
    const portKeys = portIds.map((p) => portKey(d.id, p));
    const isWan = (p: string) => d.config.interfaces.find((i) => i.id === p)?.wan === true;
    if (isBridge(d)) {
      for (let i = 1; i < portKeys.length; i++) union(portKeys[0], portKeys[i]);
    } else if (d.type === "wirelessRouter") {
      const lan = portKeys.filter((p) => !isWan(p));
      for (let i = 1; i < lan.length; i++) union(lan[0], lan[i]);
      for (const p of portKeys) if (!parent.has(p)) parent.set(p, p);
    } else {
      for (const p of portKeys) if (!parent.has(p)) parent.set(p, p);
    }
  }

  for (const c of cables) {
    const from = devices.find((x) => x.id === c.fromDevice);
    const to = devices.find((x) => x.id === c.toDevice);
    if (!from || !to) continue;
    if (isPoweredOff(from) || isPoweredOff(to)) continue;
    const fromPort = from.config.interfaces.find((i) => i.id === c.fromPort);
    const toPort = to.config.interfaces.find((i) => i.id === c.toPort);
    if (!fromPort || !toPort) continue;
    if (fromPort.status === "down" || toPort.status === "down") continue;
    union(portKey(c.fromDevice, c.fromPort), portKey(c.toDevice, c.toPort));
  }

  for (const l of wirelessLinks) {
    union(radioKey(l.deviceId), radioKey(l.apId));
  }

  return find;
}

// ---------------------------------------------------------------------------
// L2 path search from (device, port) to (device, port), walking cables and
// through bridges. Steps name the cable crossed or the device that forwards.
// ---------------------------------------------------------------------------

type PathNode = { deviceId: string; portId: string };

function findL2Path(
  devices: Device[],
  cables: Cable[],
  wirelessLinks: WirelessLink[],
  fromNode: { deviceId: string; portId: string },
  toNode: { deviceId: string; portId: string }
): { path: PathNode[]; viaCableIds: (string | undefined)[] } | null {
  if (fromNode.deviceId === toNode.deviceId && fromNode.portId === toNode.portId) {
    return { path: [fromNode], viaCableIds: [] };
  }

  const device = (id: string) => devices.find((d) => d.id === id);
  const start = portKey(fromNode.deviceId, fromNode.portId);
  const goal = portKey(toNode.deviceId, toNode.portId);
  const visited = new Set<string>([start]);
  const cameFrom = new Map<string, { prev: string; viaCableId?: string }>();
  const queue: { nodeId: string; deviceId: string; portId: string }[] = [{ nodeId: start, deviceId: fromNode.deviceId, portId: fromNode.portId }];
  let goalKey: string | null = null;

  while (queue.length > 0 && goalKey === null) {
    const cur = queue.shift()!;
    const neighbors: { nodeId: string; deviceId: string; portId: string; viaCableId?: string }[] = [];
    for (const c of cables) {
      if (c.fromDevice === cur.deviceId && c.fromPort === cur.portId) {
        neighbors.push({ nodeId: portKey(c.toDevice, c.toPort), deviceId: c.toDevice, portId: c.toPort, viaCableId: c.id });
      }
      if (c.toDevice === cur.deviceId && c.toPort === cur.portId) {
        neighbors.push({ nodeId: portKey(c.fromDevice, c.fromPort), deviceId: c.fromDevice, portId: c.fromPort, viaCableId: c.id });
      }
    }
    const curDevice = device(cur.deviceId);
    if (curDevice && (isBridge(curDevice) || curDevice.type === "wirelessRouter")) {
      const allPorts = curDevice.config.interfaces
        .filter((i) => curDevice.type !== "wirelessRouter" || !i.wan)
        .map((i) => i.id);
      if (curDevice.type === "accessPoint" || curDevice.type === "wirelessRouter") allPorts.push(WIFI_PORT);
      for (const p of allPorts) {
        if (p !== cur.portId) neighbors.push({ nodeId: portKey(cur.deviceId, p), deviceId: cur.deviceId, portId: p });
      }
    }
    for (const l of wirelessLinks) {
      if (l.deviceId === cur.deviceId && cur.portId === WIFI_PORT) {
        neighbors.push({ nodeId: portKey(l.apId, WIFI_PORT), deviceId: l.apId, portId: WIFI_PORT });
      }
      if (l.apId === cur.deviceId && cur.portId === WIFI_PORT) {
        neighbors.push({ nodeId: portKey(l.deviceId, WIFI_PORT), deviceId: l.deviceId, portId: WIFI_PORT });
      }
    }

    for (const nb of neighbors) {
      if (visited.has(nb.nodeId)) continue;
      visited.add(nb.nodeId);
      cameFrom.set(nb.nodeId, { prev: cur.nodeId, viaCableId: nb.viaCableId });
      if (nb.nodeId === goal) {
        goalKey = nb.nodeId;
        break;
      }
      queue.push(nb);
    }
  }

  if (goalKey === null) return null;

  const path: PathNode[] = [];
  const viaCableIds: (string | undefined)[] = [];
  let k: string | null = goalKey;
  const stack: string[] = [];
  while (k) {
    stack.push(k);
    const cf = cameFrom.get(k);
    k = cf ? cf.prev : null;
  }
  stack.reverse();
  for (let i = 0; i < stack.length; i++) {
    const [did, pid] = stack[i].split("::");
    path.push({ deviceId: did, portId: pid });
    viaCableIds.push(cameFrom.get(stack[i])?.viaCableId);
  }
  return { path, viaCableIds };
}

// ---------------------------------------------------------------------------
// Addressing helpers.
// ---------------------------------------------------------------------------

export function deviceByIp(devices: Device[], ip: string): { device: Device; portId: string } | null {
  for (const d of devices) {
    for (const i of d.config.interfaces) {
      if (i.ip === ip) return { device: d, portId: i.id };
    }
  }
  return null;
}

function targetMask(target: Device, portId: string): string {
  const iface = target.config.interfaces.find((i) => i.id === portId);
  return iface?.mask ?? "255.255.255.0";
}

/** ARP cache of a device: every neighbor reachable at layer 2 with an IP. */
export function arpCache(snap: NetSnapshot, deviceId: string): { ip: string; mac: string; deviceId: string; port: string }[] {
  const srcPort = deviceActivePort(snap.devices, deviceId, snap.wirelessLinks);
  if (!srcPort) return [];
  const find = unionFind(snap.devices, snap.cables, snap.wirelessLinks);
  const myRoot = find(portKey(deviceId, srcPort));
  const out: { ip: string; mac: string; deviceId: string; port: string }[] = [];
  const seen = new Set<string>();
  for (const d of snap.devices) {
    if (d.id === deviceId || isPoweredOff(d)) continue;
    const dPort = deviceActivePort(snap.devices, d.id, snap.wirelessLinks);
    if (!dPort) continue;
    const ip = d.config.interfaces.find((i) => i.ip)?.ip;
    if (!ip) continue;
    if (find(portKey(d.id, dPort)) !== myRoot) continue;
    if (seen.has(ip)) continue;
    seen.add(ip);
    out.push({ ip, mac: d.config.mac, deviceId: d.id, port: dPort });
  }
  return out;
}

/** Direct neighbours (cable or wireless) of a device, with port + link state. */
export function neighborsOf(snap: NetSnapshot, deviceId: string): { deviceId: string; port: string; viaCableId?: string; up: boolean }[] {
  const out: { deviceId: string; port: string; viaCableId?: string; up: boolean }[] = [];
  for (const c of snap.cables) {
    if (c.fromDevice === deviceId) {
      const other = snap.devices.find((d) => d.id === c.toDevice);
      const st = other ? cableStatus(c, snap.devices) : "error";
      out.push({ deviceId: c.toDevice, port: c.toPort, viaCableId: c.id, up: st === "up" });
    } else if (c.toDevice === deviceId) {
      const other = snap.devices.find((d) => d.id === c.fromDevice);
      const st = other ? cableStatus(c, snap.devices) : "error";
      out.push({ deviceId: c.fromDevice, port: c.fromPort, viaCableId: c.id, up: st === "up" });
    }
  }
  for (const l of snap.wirelessLinks) {
    if (l.apId === deviceId) out.push({ deviceId: l.deviceId, port: "radio0", up: true });
    if (l.deviceId === deviceId) out.push({ deviceId: l.apId, port: "radio0", up: true });
  }
  return out;
}

function resolveDns(devices: Device[], name: string, dnsIp?: string): { ip: string | null; refused: boolean } {
  const server = dnsIp ? deviceByIp(devices, dnsIp)?.device : devices.find((d) => d.type === "server" && d.dnsRecords && d.dnsRecords.length > 0);
  if (!server || !server.dnsRecords) return { ip: null, refused: false };
  if (isPoweredOff(server) || !serviceOn(server, "dns")) return { ip: null, refused: true };
  const rec = server.dnsRecords.find((r) => r.name === name);
  return { ip: rec ? rec.ip : null, refused: false };
}

/** Public DNS lookup — returns the IP, or why it failed (used by nslookup/UI). */
export function dnsLookup(snap: NetSnapshot, name: string, dnsIp?: string): { ip: string | null; refused: boolean } {
  return resolveDns(snap.devices, name, dnsIp);
}

// ---------------------------------------------------------------------------
// Routing decisions.
// ---------------------------------------------------------------------------

/** Outgoing interface on `router` whose subnet contains `ip`, if any. */
function connectedInterface(router: Device, ip: string): string | null {
  const tp = parseIp(ip);
  if (!tp) return null;
  for (const i of router.config.interfaces) {
    if (i.ip && i.mask && i.status === "up" && isSameNetwork(parseIp(i.ip)!, i.mask, tp, i.mask)) return i.id;
  }
  return null;
}

/** Next-hop IP for a static route, or null. Returns "0.0.0.0" for default route. */
function staticRouteNextHop(router: Device, ip: string): string | null {
  const tp = parseIp(ip);
  if (!tp) return null;
  for (const r of router.routes) {
    const net = parseIp(r.network);
    if (!net) continue;
    const masked = networkOf(tp, r.mask);
    if (masked.a === net.a && masked.b === net.b && masked.c === net.c && masked.d === net.d) {
      return r.nextHop === "0.0.0.0" ? "0.0.0.0" : r.nextHop;
    }
  }
  return null;
}

function defaultGateway(router: Device): string | null {
  const r = router.routes.find((x) => x.network === "0.0.0.0" && x.mask === "0.0.0.0");
  return r && r.nextHop !== "0.0.0.0" ? r.nextHop : null;
}

function label(d: Device): string {
  return d.config.hostname || d.config.name || DEVICE_TYPES[d.type].label;
}

// ---------------------------------------------------------------------------
// Structured faults — the educational "what / why / how to fix" card shared by
// the CLI, the packet lab, the canvas highlight and the teaching notes.
// ---------------------------------------------------------------------------

export type FaultSpec = {
  code: string;
  reason: string;
  what: string;
  why: string;
  fix: string;
  deviceId?: string;
  cableIds?: string[];
  ifaceId?: string;
};

function brokenCables(snap: NetSnapshot, deviceId: string): string[] {
  return snap.cables.filter((c) => (c.fromDevice === deviceId || c.toDevice === deviceId) && cableStatus(c, snap.devices) !== "up").map((c) => c.id);
}

export function buildFault(snap: NetSnapshot, spec: FaultSpec): PingFault {
  return {
    code: spec.code,
    reason: spec.reason,
    what: spec.what,
    why: spec.why,
    fix: spec.fix,
    deviceIds: spec.deviceId ? [spec.deviceId] : [],
    cableIds: spec.code === "no-path" && spec.deviceId ? [...(spec.cableIds ?? []), ...brokenCables(snap, spec.deviceId)] : (spec.cableIds ?? []),
    ifaceIds: spec.ifaceId ? [spec.ifaceId] : [],
  };
}

/** Plain-English fault specs for every failure the ping pipeline can hit. */
export const PING_FAULTS = {
  sourceOff: (id: string): FaultSpec => ({
    code: "source-off",
    reason: "The source device is powered off.",
    what: "The packet never left the computer because it is switched off.",
    why: "A powered-off device cannot run its network card or build frames.",
    fix: "Turn the device back on (config panel → Power, or the device menu).",
    deviceId: id,
  }),
  targetOff: (id: string): FaultSpec => ({
    code: "target-off",
    reason: "The destination device is powered off.",
    what: "The destination never answered because it is not powered on.",
    why: "A powered-off device cannot process or reply to packets.",
    fix: "Power the destination back on in its config panel.",
    deviceId: id,
  }),
  ifaceDown: (id: string, ifaceId?: string): FaultSpec => ({
    code: "iface-down",
    reason: "The network interface is administratively down.",
    what: "The packet could not be transmitted because the interface is disabled.",
    why: "An interface left in 'shutdown' refuses to carry any traffic.",
    fix: "Re-enable the interface ('no shutdown') in the device's config panel.",
    deviceId: id,
    ifaceId,
  }),
  targetIfaceDown: (id: string, ifaceId?: string): FaultSpec => ({
    code: "target-iface-down",
    reason: "The destination interface is down.",
    what: "The request arrived, but the destination has no enabled interface to answer on.",
    why: "An interface left in 'shutdown' refuses to carry any traffic.",
    fix: "Re-enable the destination interface ('no shutdown') in its config panel.",
    deviceId: id,
    ifaceId,
  }),
  noIp: (id: string, ifaceId?: string): FaultSpec => ({
    code: "no-ip",
    reason: "The source device has no IP address.",
    what: "The packet cannot be built because the device has no source address.",
    why: "An IP address identifies the device on the network — without one it cannot send or receive IP traffic.",
    fix: "Enable DHCP or set an IP address + subnet mask in the config panel.",
    deviceId: id,
    ifaceId,
  }),
  hostNotFound: (ip: string): FaultSpec => ({
    code: "host-not-found",
    reason: `No device with this IP (${ip}) exists.`,
    what: "The ping was sent, but nothing on the network answered.",
    why: "No device in the lab has that IP address configured on any interface.",
    fix: "Give the destination that IP in its config panel, or ping the address shown on a device.",
  }),
  dnsFailed: (name: string, id: string): FaultSpec => ({
    code: "dns-failed",
    reason: `DNS could not resolve "${name}".`,
    what: "The device asked its DNS server for the name, and got no matching record.",
    why: "No DNS record maps that name to an IP address.",
    fix: "Add a DNS record on the DNS server, or use the IP address directly.",
    deviceId: id,
  }),
  dnsRefused: (id: string): FaultSpec => ({
    code: "dns-refused",
    reason: "The DNS server is not answering.",
    what: "The device asked for a hostname, but the DNS service refused the request.",
    why: "The DNS server is powered off, or its DNS service is disabled.",
    fix: "Power the DNS server on and enable its DNS service in the Services panel.",
    deviceId: id,
  }),
  serviceDown: (id: string, key: string, label: string): FaultSpec => ({
    code: "service-down",
    reason: `${label} is not running (connection refused).`,
    what: `The packet reached ${label}, but nothing is listening on that service anymore.`,
    why: "A real server refuses a connection when the requested service is stopped.",
    fix: `Enable the ${label} service in the server's Services panel.`,
    deviceId: id,
  }),
  noPath: (id: string): FaultSpec => ({
    code: "no-path",
    reason: "The device is not physically connected.",
    what: "The packet had no cable path to follow to the next hop.",
    why: "No working link connects the device to the network — a cable is missing, a port is down, or the neighbor is off.",
    fix: "Connect the device to a switch / access point and make sure every link is up.",
    deviceId: id,
  }),
  noGateway: (id: string): FaultSpec => ({
    code: "no-gateway",
    reason: "No default gateway configured.",
    what: "The destination is on another subnet, but the device has no gateway to hand the packet to.",
    why: "End devices only know their own subnet; traffic for any other network must be sent to a router, and none is configured.",
    fix: "Set the default gateway to the router's LAN IP (e.g. 192.168.1.1) in the config panel.",
    deviceId: id,
  }),
  gatewayNotInSubnet: (id: string, gw: string): FaultSpec => ({
    code: "gateway-not-in-subnet",
    reason: `The gateway ${gw} is not in the device's subnet.`,
    what: "The device tried to use its gateway, but that address is unreachable at layer 2.",
    why: "A gateway must share the same subnet as the device's own IP, otherwise frames can never reach it.",
    fix: "Set the gateway to an IP inside the device's own subnet (e.g. the router's .1 address).",
    deviceId: id,
  }),
  gatewayMissing: (id: string, gw: string): FaultSpec => ({
    code: "gateway-missing",
    reason: `No device has the gateway IP ${gw}.`,
    what: "The device sent its packet toward the gateway, but no device owns that address.",
    why: "The gateway IP must actually be configured on the router's LAN interface.",
    fix: "Configure the router's LAN interface with ${gw}, or correct the gateway setting.",
    deviceId: id,
  }),
  noRoute: (id: string, ip: string): FaultSpec => ({
    code: "no-route",
    reason: `The router has no route to ${ip}.`,
    what: "The router received the packet but does not know where to send it.",
    why: "Routers only know their connected networks unless static (or dynamic) routes are added.",
    fix: "Add a static route (or default route) for that network in the router's config panel.",
    deviceId: id,
  }),
  nextHopMissing: (id: string, nh: string): FaultSpec => ({
    code: "next-hop-missing",
    reason: `The next-hop router ${nh} is missing or unreachable.`,
    what: "The router's route points at a next hop that does not exist or is not connected.",
    why: "A route is only usable when the next hop IP actually exists on a reachable segment.",
    fix: "Fix the next-hop address in the route, or connect/configure that router.",
    deviceId: id,
  }),
  loop: (id: string): FaultSpec => ({
    code: "loop",
    reason: "A routing loop is bouncing the packet.",
    what: "The packet visited the same router twice — the path goes in a circle.",
    why: "Two routers point at each other (or at a router that routes back) for the same network.",
    fix: "Fix the static routes so each network is reached by a single, acyclic path.",
    deviceId: id,
  }),
  noMacReply: (id: string, who: string): FaultSpec => ({
    code: "arp-no-reply",
    reason: "No reply to the ARP request.",
    what: `The device asked "who has ${who}?" over ARP and nobody answered.`,
    why: "The neighbor is off, disconnected, or on a different segment.",
    fix: "Check the cable, power, and interface status of the neighbor.",
    deviceId: id,
  }),
} as const;

// ---------------------------------------------------------------------------
// Main entry point.
// ---------------------------------------------------------------------------

export function runPacket(snap: NetSnapshot, run: PacketRun): TraceResult {
  const steps: TraceStep[] = [];
  const { devices, cables, wirelessLinks: wireless } = snap;
  const step = makeStep(devices);
  const failure = (s: TraceStep[], error: string, spec?: FaultSpec) => fail(snap, run, s, error, spec);

  const source = devices.find((d) => d.id === run.sourceId);
  if (!source) return failure(steps, "Source device not found.");

  // 1. Source powered on?
  if (isPoweredOff(source)) {
    steps.push(step(source.id, "L1", "Source powered off", `${label(source)} is powered off — it cannot send anything.`, "fail"));
    return failure(steps, "Request timed out.", PING_FAULTS.sourceOff(source.id));
  }

  // 2 + 4. Source has an enabled interface carrying an IP.
  const upIface = source.config.interfaces.find((i) => i.status === "up");
  if (!upIface) {
    steps.push(step(source.id, "L1", "Interface down", `${label(source)} has no enabled interface — it is administratively down.`, "fail"));
    return failure(steps, "General failure.", PING_FAULTS.ifaceDown(source.id));
  }
  const sourceIpIf = source.config.interfaces.find((i) => i.ip && i.status === "up");
  if (!sourceIpIf) {
    steps.push(step(source.id, "L3", "No IP address", `${label(source)} has no usable IP address — it must get one from DHCP or a static config.`, "fail"));
    return failure(steps, "General failure.", PING_FAULTS.noIp(source.id, upIface.id));
  }
  const sourceIp = sourceIpIf.ip!;
  const sourceMask = sourceIpIf.mask ?? "255.255.255.0";
  const sourceNet = networkOf(parseIp(sourceIp)!, sourceMask);

  const sourcePort = deviceActivePort(devices, source.id, wireless);
  if (!sourcePort) {
    return failure(steps, "Request timed out.", PING_FAULTS.noPath(source.id));
  }

  // ---- Resolve target.
  let targetIp = run.target;
  if (parseIp(run.target) === null) {
    if (run.type !== "icmp") return failure(steps, `Enter an IP address for ${run.type.toUpperCase()} traffic (or use ping with a hostname).`);
    steps.push(step(source.id, "L7", "DNS lookup", `${label(source)} doesn't know "${run.target}", so it asks its DNS server.`));
    const resolved = resolveDns(devices, run.target, source.config.dns);
    if (resolved.refused) {
      steps.push(step(source.id, "L7", "DNS: connection refused", `The DNS server is offline or its DNS service is disabled.`, "fail"));
      return failure(steps, "The DNS server is not answering.", PING_FAULTS.dnsRefused(source.id));
    }
    if (!resolved.ip) {
      steps.push(step(source.id, "L7", "DNS: no answer", `No DNS record for "${run.target}".`, "fail"));
      return failure(steps, `Ping request could not find host "${run.target}".`, PING_FAULTS.dnsFailed(run.target, source.id));
    }
    steps.push(step(source.id, "L7", `DNS: ${run.target} -> ${resolved.ip}`, `The DNS server answered with ${resolved.ip}.`));
    targetIp = resolved.ip;
  }
  const targetParsed = parseIp(targetIp);
  if (!targetParsed) return failure(steps, `"${run.target}" is not a valid IP address.`);

  // 3 + 5. Destination exists.
  const targetInfo = deviceByIp(devices, targetIp);
  if (!targetInfo) {
    steps.push(step(source.id, "L3", "Destination unknown", `No device has the IP ${targetIp}.`, "fail"));
    return failure(steps, "Ping request could not find host.", PING_FAULTS.hostNotFound(targetIp));
  }
  const target = targetInfo.device;
  const targetPort = wireless.some((l) => l.deviceId === target.id) ? WIFI_PORT : targetInfo.portId;

  // 6. Destination powered on?
  if (isPoweredOff(target)) {
    steps.push(step(target.id, "L1", "Destination powered off", `${label(target)} is powered off and cannot reply.`, "fail"));
    return failure(steps, "Request timed out.", PING_FAULTS.targetOff(target.id));
  }

  // 7 + 10. Destination has an enabled interface (and it carries the target IP).
  const targetUpIface = target.config.interfaces.find((i) => i.status === "up");
  if (!targetUpIface) {
    steps.push(step(target.id, "L1", "Destination interface down", `${label(target)} has no enabled interface to answer on.`, "fail"));
    return failure(steps, "Request timed out.", PING_FAULTS.targetIfaceDown(target.id, targetInfo.portId));
  }

  const find = unionFind(devices, cables, wireless);
  const sameNet = isSameNetwork(parseIp(sourceIp)!, sourceMask, targetParsed, targetMask(target, targetInfo.portId));

  // ---- Build the leg list: each leg goes from a device out one port to the
  // next L3 destination (gateway/router or the final target).
  type Leg = { startDeviceId: string; startPortId: string; endDeviceId: string; endPortId: string; arpFor: string; note: string };
  const legs: Leg[] = [];
  const seenRouters = new Set<string>();
  let currentLeg: { device: Device; viaPort?: string } = { device: source };
  let guard = 0;

  if (sameNet) {
    steps.push(step(source.id, "L3", "Same subnet", `${targetIp} is in ${label(source)}'s subnet (${formatIp(sourceNet)}/${maskToBits(sourceMask)}), so delivery is direct.`));
    legs.push({ startDeviceId: source.id, startPortId: sourcePort, endDeviceId: target.id, endPortId: targetPort, arpFor: targetIp, note: "direct" });
  } else {
    steps.push(step(source.id, "L3", "Different subnet", `${targetIp} is NOT in ${label(source)}'s subnet (${formatIp(sourceNet)}/${maskToBits(sourceMask)}). The packet must go through a router.`));

    while (guard++ < 8) {
      const d = currentLeg.device;
      if (isPoweredOff(d)) {
        steps.push(step(d.id, "L1", "Router powered off", `${label(d)} is powered off and cannot forward the packet.`, "fail"));
        return failure(steps, "Request timed out.", PING_FAULTS.targetOff(d.id));
      }
      if (isRouter(d)) {
        const outIf = connectedInterface(d, targetIp);
        if (outIf) {
          steps.push(step(d.id, "L3", `Forward out ${outIf}`, `${label(d)} has ${targetIp} in a connected subnet — it sends the packet out ${outIf}.`));
          legs.push({ startDeviceId: d.id, startPortId: outIf, endDeviceId: target.id, endPortId: targetPort, arpFor: targetIp, note: `routed from ${label(d)}` });
          break;
        }
        const nh = staticRouteNextHop(d, targetIp);
        const nhIp = nh === "0.0.0.0" ? defaultGateway(d) : nh;
        if (!nhIp) {
          steps.push(step(d.id, "L3", "No route", `${label(d)} has no route for ${targetIp}.`, "fail"));
          return failure(steps, "Destination host unreachable.", PING_FAULTS.noRoute(d.id, targetIp));
        }
        if (nh === "0.0.0.0") {
          steps.push(step(d.id, "L3", "Default route", `${label(d)} uses its default route and forwards toward ${nhIp}.`));
        } else {
          steps.push(step(d.id, "L3", "Static route", `${label(d)} matches a static route and forwards toward ${nhIp}.`));
        }
        const nhInfo = deviceByIp(devices, nhIp);
        if (!nhInfo) {
          steps.push(step(d.id, "L3", "Next hop missing", `No device has IP ${nhIp}.`, "fail"));
          return failure(steps, "Request timed out.", PING_FAULTS.nextHopMissing(d.id, nhIp));
        }
        if (seenRouters.has(nhInfo.device.id)) {
          steps.push(step(d.id, "L3", "Routing loop", `Forwarding to ${label(nhInfo.device)} again — a loop.`, "fail"));
          return failure(steps, "Request timed out.", PING_FAULTS.loop(d.id));
        }
        seenRouters.add(nhInfo.device.id);
        const outPort = d.config.interfaces.find((i) => i.status === "up" && find(portKey(d.id, i.id)) === find(portKey(nhInfo.device.id, nhInfo.portId)));
        if (!outPort) {
          steps.push(step(d.id, "L2", "Next hop unreachable", `${label(nhInfo.device)} (${nhIp}) is not reachable at layer 2 from any interface of ${label(d)}.`, "fail"));
          return failure(steps, "Request timed out.", PING_FAULTS.noPath(d.id));
        }
        legs.push({ startDeviceId: d.id, startPortId: outPort.id, endDeviceId: nhInfo.device.id, endPortId: nhInfo.portId, arpFor: nhIp, note: `forwarded to ${label(nhInfo.device)}` });
        currentLeg = { device: nhInfo.device };
      } else {
        const gw = d.config.gateway;
        if (!gw) {
          steps.push(step(d.id, "L3", "No gateway", `Because ${targetIp} is remote, ${label(d)} needs a default gateway — none is set.`, "fail"));
          return failure(steps, "Destination host unreachable.", PING_FAULTS.noGateway(d.id));
        }
        const gwp = parseIp(gw);
        const dIp = d.config.interfaces.find((i) => i.ip);
        const dMask = dIp?.mask ?? "255.255.255.0";
        if (!gwp || !dIp || !isSameNetwork(parseIp(dIp.ip!)!, dMask, gwp, dMask)) {
          steps.push(step(d.id, "L3", "Gateway not in subnet", `The gateway ${gw} is not in ${label(d)}'s subnet — frames can never reach it.`, "fail"));
          return failure(steps, "Destination host unreachable.", PING_FAULTS.gatewayNotInSubnet(d.id, gw));
        }
        const gwInfo = deviceByIp(devices, gw);
        if (!gwInfo) {
          steps.push(step(d.id, "L3", "Gateway missing", `No device has the gateway IP ${gw}.`, "fail"));
          return failure(steps, "Destination host unreachable.", PING_FAULTS.gatewayMissing(d.id, gw));
        }
        steps.push(step(d.id, "L3", "Send to gateway", `${label(d)} sends the packet to its gateway ${gw}.`));
        legs.push({ startDeviceId: d.id, startPortId: sourcePort, endDeviceId: gwInfo.device.id, endPortId: gwInfo.portId, arpFor: gw, note: `via gateway ${gw}` });
        currentLeg = { device: gwInfo.device };
      }
    }
    if (guard >= 8) return failure(steps, "Too many hops — is there a routing loop?");
  }

  // ---- Execute legs.
  for (const leg of legs) {
    const startDev = devices.find((x) => x.id === leg.startDeviceId)!;
    steps.push(step(startDev.id, "L2", "ARP request", `${label(startDev)} broadcasts "who has ${leg.arpFor}?" to resolve its MAC address.`));

    const route = findL2Path(devices, cables, wireless, { deviceId: leg.startDeviceId, portId: leg.startPortId }, { deviceId: leg.endDeviceId, portId: leg.endPortId });
    if (!route) {
      steps.push(step(startDev.id, "L1", "No path", `No cable path from ${label(startDev)} (port ${leg.startPortId}) to ${label(devices.find((x) => x.id === leg.endDeviceId)!)} (${leg.endPortId}).`, "fail"));
      return failure(steps, "Request timed out.", PING_FAULTS.noPath(startDev.id));
    }
    for (let i = 1; i < route.path.length; i++) {
      const p = route.path[i];
      const viaCable = route.viaCableIds[i];
      const pDevice = devices.find((x) => x.id === p.deviceId)!;
      if (viaCable) {
        steps.push(step(p.deviceId, "L1", "Frame on cable", `The frame travels the cable to ${label(pDevice)}.`, undefined, viaCable));
      }
      if (isBridge(pDevice)) {
        const known = Boolean(snap.macTables[pDevice.id]?.[target.config.mac]);
        steps.push(step(pDevice.id, "L2", "MAC lookup", known ? `${label(pDevice)} knows the destination MAC and forwards only to the right port.` : `${label(pDevice)} doesn't know the destination MAC — it floods the frame to every port.`, known ? "ok" : "warn"));
      } else if (i === route.path.length - 1) {
        steps.push(step(pDevice.id, "L2", "Delivered at L2", `${label(pDevice)} received the frame on ${p.portId}.`));
      }
    }
  }

  const SERVICE_FOR_TYPE: Partial<Record<PacketType, { key: import("./types").ServerServiceKey; label: string }>> = {
    http: { key: "http", label: "HTTP service" },
    ftp: { key: "ftp", label: "FTP service" },
  };
  const svc = SERVICE_FOR_TYPE[run.type];
  if (svc && !serviceOn(target, svc.key)) {
    steps.push(step(target.id, "L7", `${svc.key.toUpperCase()} refused`, `${label(target)} is not running its ${svc.label} — the connection is refused.`, "fail"));
    return failure(steps, "Connection refused.", PING_FAULTS.serviceDown(target.id, svc.key, svc.label));
  }

  const summaries: Record<PacketType, string> = {
    icmp: `Reply from ${targetIp}: bytes=32 time=2ms TTL=64`,
    http: `200 OK — ${label(target)} served the HTTP request`,
    dns: `DNS response from ${targetIp}: resolved`,
    dhcp: `DHCP offer from ${targetIp}: IP assigned`,
    ftp: `FTP transfer to ${label(target)} completed`,
  };
  steps.push(step(target.id, run.type === "icmp" ? "L4" : "L7", "Delivered", `${label(target)} received and answered the ${run.type.toUpperCase()} request.`));

  return { ok: true, type: run.type, sourceId: run.sourceId, target: targetIp, steps, summary: summaries[run.type] };
}

function makeStep(devices: Device[]) {
  return (deviceId: string, layer: TraceStep["layer"], action: string, detail: string, status?: TraceStep["status"], cableId?: string): TraceStep => {
    const found = devices.find((d) => d.id === deviceId);
    return {
      deviceId,
      deviceLabel: found ? label(found) : deviceId,
      cableId,
      layer,
      action,
      detail,
      status,
    };
  };
}

function fail(snap: NetSnapshot, run: PacketRun, steps: TraceStep[], error: string, spec?: FaultSpec): TraceResult {
  const result: TraceResult = { ok: false, type: run.type, sourceId: run.sourceId, target: run.target, steps, summary: error, error };
  if (spec) {
    result.reason = spec.reason;
    result.fault = buildFault(snap, spec);
  }
  return result;
}

// ---------------------------------------------------------------------------
// DHCP: assign an address from a server's pool on the same L2 segment.
// ---------------------------------------------------------------------------

export type DhcpResult = {
  ok: boolean;
  device?: Device;
  steps: TraceStep[];
  summary: string;
  error?: string;
};

export function dhcpAssign(snap: NetSnapshot, deviceId: string): DhcpResult {
  const steps: TraceStep[] = [];
  const step = makeStep(snap.devices);
  const device = snap.devices.find((d) => d.id === deviceId);
  if (!device) return { ok: false, steps, summary: "Device not found.", error: "Device not found." };
  if (isPoweredOff(device)) {
    return { ok: false, steps, summary: "The device is powered off.", error: "Power the device back on before requesting an address." };
  }

  const srcPort = deviceActivePort(snap.devices, deviceId, snap.wirelessLinks);
  if (!srcPort) return { ok: false, steps, summary: "Not connected to any network.", error: "Connect the device to a switch (or Wi-Fi) first." };

  const find = unionFind(snap.devices, snap.cables, snap.wirelessLinks);
  const myRoot = find(portKey(deviceId, srcPort));

  const server = snap.devices.find((d) => {
    if (isPoweredOff(d) || !d.dhcpPool || !serviceOn(d, "dhcp")) return false;
    const dPort = deviceActivePort(snap.devices, d.id, snap.wirelessLinks) ?? d.config.interfaces.find((i) => i.status === "up")?.id;
    if (!dPort) return false;
    return find(portKey(d.id, dPort)) === myRoot;
  });

  if (!server) {
    steps.push(step(deviceId, "L7", "DHCPDISCOVER", `${label(device)} broadcasts a DHCPDISCOVER — but no DHCP server is on this segment.`, "fail"));
    return { ok: false, steps, summary: "No DHCP server found on this network.", error: "No DHCP server on this segment. Add a server with a DHCP pool and connect it here, or check its DHCP service." };
  }

  steps.push(step(deviceId, "L7", "DHCPDISCOVER", `${label(device)} broadcasts a DHCPDISCOVER onto the segment.`));
  steps.push(step(server.id, "L7", "DHCPOFFER", `${label(server)} answers with a DHCPOFFER from its pool.`));

  const start = parseIp(server.dhcpPool!.start);
  const end = parseIp(server.dhcpPool!.end);
  if (!start || !end) {
    return { ok: false, steps, summary: "Server pool is invalid.", error: `The DHCP pool on ${label(server)} is invalid.` };
  }
  const used = new Set<string>();
  for (const d of snap.devices) {
    for (const i of d.config.interfaces) if (i.ip) used.add(i.ip);
  }
  const serverIp = server.config.interfaces.find((i) => i.ip)?.ip;
  const poolSize = Math.min(254, 1 + Math.floor((ipToInt(end) - ipToInt(start)) / 1));
  let assigned: string | null = null;
  for (let n = 0; n < poolSize; n++) {
    const candidate = intToIp(ipToInt(start) + n);
    const candStr = formatIp(candidate);
    if (!used.has(candStr)) {
      assigned = candStr;
      break;
    }
  }
  if (!assigned) return { ok: false, steps, summary: "DHCP pool exhausted.", error: "All addresses in the pool are taken." };

  const mask = server.config.interfaces.find((i) => i.ip)?.mask ?? "255.255.255.0";
  const gateway = server.config.interfaces.find((i) => i.ip && isSameNetwork(parseIp(i.ip)!, i.mask ?? mask, parseIp(assigned)!, mask))?.ip;
  const dns = server.dnsRecords?.length ? serverIp : undefined;

  const updated: Device = {
    ...device,
    config: {
      ...device.config,
      dhcp: true,
      interfaces: device.config.interfaces.map((i) => (i.ip ? { ...i, ip: undefined, mask: undefined, status: i.status } : i)),
    },
  };
  const ifaceIdx = updated.config.interfaces.findIndex((i) => i.id === srcPort || i.kind !== "wireless");
  if (ifaceIdx >= 0) {
    updated.config.interfaces[ifaceIdx] = {
      ...updated.config.interfaces[ifaceIdx],
      ip: assigned,
      mask,
      status: "up",
    };
    updated.config.gateway = gateway;
    updated.config.dns = dns;
  }

  steps.push(step(deviceId, "L7", "DHCPREQUEST/ACK", `${label(device)} received ${assigned}/${maskToBits(mask)} (gateway ${gateway ?? "none"}, DNS ${dns ?? "none"}).`));

  return { ok: true, device: updated, steps, summary: `${label(device)} got ${assigned} from ${label(server)}.` };
}

// ---------------------------------------------------------------------------
// Diagnostics — the engine behind troubleshooting mode. Returns the FIRST
// problem it finds so students fix one thing at a time.
// ---------------------------------------------------------------------------

export type Diagnosis = { ok: boolean; step: string; message: string; hint: string };

export function diagnose(snap: NetSnapshot, sourceId: string, target: string): Diagnosis {
  const { devices, wirelessLinks: wireless } = snap;
  const source = devices.find((d) => d.id === sourceId);
  if (!source) return { ok: false, step: "source", message: "Source device missing.", hint: "" };

  if (isPoweredOff(source)) {
    return { ok: false, step: "interface", message: `${label(source)} is powered off.`, hint: "Turn the device back on in its config panel (Power)." };
  }

  const iface = source.config.interfaces.find((i) => i.status === "up" && i.ip);
  const upIface = source.config.interfaces.find((i) => i.status === "up");
  if (!upIface) {
    return { ok: false, step: "interface", message: `${label(source)} has every interface down (shutdown).`, hint: `Toggle the port back up in the device panel, or run "no shutdown" in the CLI.` };
  }
  if (!iface) {
    return { ok: false, step: "ip", message: `${label(source)} has no IP address.`, hint: `Enable DHCP in the config panel, or set an IP + subnet mask manually.` };
  }
  const srcIp = iface.ip!;
  const srcMask = iface.mask ?? "255.255.255.0";

  const targetInfo = deviceByIp(devices, target);
  if (!targetInfo) {
    return { ok: false, step: "target", message: `No device has IP ${target}.`, hint: `Give the destination device that IP in its config panel.` };
  }
  const targetDevice = targetInfo.device;
  if (isPoweredOff(targetDevice)) {
    return { ok: false, step: "target", message: `${label(targetDevice)} is powered off.`, hint: "Power the destination back on in its config panel." };
  }
  if (!targetDevice.config.interfaces.some((i) => i.status === "up")) {
    return { ok: false, step: "target", message: `${label(targetDevice)} has no enabled interface.`, hint: "Re-enable the destination's interface ('no shutdown')." };
  }
  const tp = parseIp(target)!;
  const sameNet = isSameNetwork(parseIp(srcIp)!, srcMask, tp, targetMask(targetDevice, targetInfo.portId));

  let nextStop: string | null = target;
  if (!sameNet) {
    const gw = source.config.gateway;
    if (!gw) {
      return { ok: false, step: "gateway", message: `${label(source)} needs a gateway to reach ${target} but none is set.`, hint: `Set the default gateway (usually your router's LAN IP) in the config panel.` };
    }
    const gwp = parseIp(gw);
    if (!gwp || !isSameNetwork(parseIp(srcIp)!, srcMask, gwp, srcMask)) {
      return { ok: false, step: "gateway", message: `The gateway ${gw} is not in ${label(source)}'s subnet.`, hint: `The gateway must share ${label(source)}'s subnet (e.g. .1 on the same /24).` };
    }
    const gwDev = deviceByIp(devices, gw);
    if (!gwDev) {
      return { ok: false, step: "gateway", message: `No device has the gateway IP ${gw}.`, hint: `Configure your router with that IP on its LAN interface.` };
    }
    nextStop = gw;
  }

  // L2 reachability of the next stop.
  const find = unionFind(devices, snap.cables, wireless);
  const srcPort = deviceActivePort(devices, source.id, wireless);
  const stopInfo = deviceByIp(devices, nextStop!);
  if (!srcPort || !stopInfo) {
    return { ok: false, step: "reachability", message: `No path from ${label(source)} to ${nextStop}.`, hint: `Wire ${label(source)} into a switch (or join Wi-Fi) and make sure everything is connected.` };
  }
  const stopPort = wireless.some((l) => l.deviceId === stopInfo.device.id) ? WIFI_PORT : stopInfo.portId;
  if (find(portKey(source.id, srcPort)) !== find(portKey(stopInfo.device.id, stopPort))) {
    return { ok: false, step: "reachability", message: `${label(source)} is not on the same network segment as ${nextStop}.`, hint: `Check cables, ports left in "shutdown", and that both devices reach the same switch / access point.` };
  }

  // If a router is between them, check it has a route onward.
  if (!sameNet && source.config.gateway) {
    const router = deviceByIp(devices, source.config.gateway)?.device;
    if (router && isRouter(router)) {
      if (isPoweredOff(router)) {
        return { ok: false, step: "route", message: `${label(router)} is powered off.`, hint: "Power the router back on in its config panel." };
      }
      const outIf = connectedInterface(router, target);
      const nh = staticRouteNextHop(router, target);
      const nhIp = nh === "0.0.0.0" ? defaultGateway(router) : nh;
      if (!outIf && !nhIp) {
        const tnet = networkOf(tp, targetMask(targetDevice, targetInfo.portId));
        return { ok: false, step: "route", message: `${label(router)} has no route to ${formatIp(tnet)}/24.`, hint: `In ${label(router)}'s config panel, add a static route: network ${formatIp(tnet)} mask 255.255.255.0 next-hop <router-ip>.` };
      }
    }
  }

  return { ok: true, step: "done", message: `${label(source)} can reach ${target}.`, hint: "" };
}
