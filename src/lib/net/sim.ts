import type {
  Cable,
  CableType,
  Device,
  DeviceStats,
  InterfaceConfig,
  ProtocolName,
  ServerServiceKey,
  ServerServices,
  SimSnapshot,
  StaticRoute,
  TimelineEvent,
  TraceResult,
  WlanConfig,
} from "./types";
import { buildDefaultDeviceConfig } from "./devices";
import { cableStatus, evaluateCable } from "./cables";
import { computeWirelessLinks, diagnose, dhcpAssign, runPacket, type NetSnapshot, type PacketRun } from "./packets";
import { maskToBits, randomMac } from "./ip";
import { defaultServices } from "./services";
import { SERVER_SERVICE_KEYS } from "./types";

export type ConnectResult = { ok: boolean; error?: string; cable?: Cable };

/** Every canned scenario the lab can boot into. */
export type TemplateName = "small-lan" | "two-router" | "wifi" | "internet" | "nos-basic" | "nos-faults" | "nos-faults-routed" | "nos-capstone";

let GLOBAL_ID = 0;
const nid = () => `${Date.now().toString(36)}-${(GLOBAL_ID++).toString(36)}`;
const randomCloneMac = () => randomMac();

/**
 * The pure stateful core of the Networking Lab. One instance is held by the
 * React store on the client; fresh instances are built server-side to
 * re-validate mission submissions. No I/O, no React.
 */
export class NetworkSimulator {
  name = "My Network";
  devices: Device[] = [];
  cables: Cable[] = [];
  macTables: Record<string, Record<string, string>> = {};
  startupConfigs: SimSnapshot["startupConfigs"] = {};
  wirelessLinks = computeWirelessLinks(this.devices);

  /** Live counters (not persisted) — derived from every packet run. */
  stats: Record<string, DeviceStats> = {};
  /** The network timeline — every packet step recorded as an event. */
  events: TimelineEvent[] = [];

  private history: SimSnapshot[] = [];

  constructor(initial?: Partial<SimSnapshot>) {
    if (initial) this.load(initial);
  }

  // ---------------------------------------------------------- snapshot / io
  get snapshot(): SimSnapshot {
    return {
      version: 1,
      devices: this.devices,
      cables: this.cables,
      macTables: this.macTables,
      startupConfigs: this.startupConfigs,
      wirelessLinks: this.computeWireless(),
    };
  }

  netSnapshot(): NetSnapshot {
    return {
      devices: this.devices,
      cables: this.cables,
      macTables: this.macTables,
      wirelessLinks: this.computeWireless(),
      startupConfigs: this.startupConfigs,
    };
  }

  computeWireless() {
    return computeWirelessLinks(this.devices);
  }

  toJSON(): string {
    return JSON.stringify(this.snapshot, null, 2);
  }

  load(data: Partial<SimSnapshot>) {
    this.devices = (data.devices ?? []).map((d) => JSON.parse(JSON.stringify(d)));
    this.cables = (data.cables ?? []).map((c) => ({ ...c }));
    this.macTables = { ...(data.macTables ?? {}) };
    this.startupConfigs = { ...(data.startupConfigs ?? {}) };
    this.wirelessLinks = computeWirelessLinks(this.devices);
    this.stats = {};
    this.events = [];
  }

  pushHistory() {
    this.history.push(JSON.parse(JSON.stringify(this.snapshot)));
    if (this.history.length > 50) this.history.shift();
  }

  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.load(prev);
    return true;
  }

  canUndo() {
    return this.history.length > 0;
  }

  // ---------------------------------------------------------------- devices
  /** Replace a device wholesale (e.g. after `ipconfig /renew` changed its IP). */
  applyDevice(device: Device) {
    const idx = this.devices.findIndex((x) => x.id === device.id);
    if (idx < 0) return;
    this.pushHistory();
    this.devices[idx] = device;
    this.wirelessLinks = computeWirelessLinks(this.devices);
  }

  /** Turn a device on or off. A powered-off device cannot send or forward. */
  setPower(id: string, on: boolean) {
    const d = this.devices.find((x) => x.id === id);
    if (!d) return;
    this.pushHistory();
    if (on) delete d.poweredOn;
    else d.poweredOn = false;
    this.wirelessLinks = computeWirelessLinks(this.devices);
  }

  addDevice(type: Device["type"], x: number, y: number): Device {
    this.pushHistory();
    const device: Device = {
      id: nid(),
      type,
      x,
      y,
      config: buildDefaultDeviceConfig(type, this.devices.filter((d) => d.type === type).length),
      routes: [],
      dhcpPool: null,
      dnsRecords: type === "server" ? [] : undefined,
    };
    if (type === "accessPoint") {
      device.config.wlan = { ssid: "NetLab", enabled: true };
    }
    if (type === "wirelessRouter") {
      device.config.wlan = { ssid: "HomeNet", enabled: true };
      device.config.interfaces.find((i) => i.id === "eth0")!.ip = "10.0.0.1";
      device.config.interfaces.find((i) => i.id === "eth0")!.mask = "255.255.255.0";
      device.config.interfaces.find((i) => i.id === "eth1")!.ip = "192.168.1.1";
      device.config.interfaces.find((i) => i.id === "eth1")!.mask = "255.255.255.0";
    }
    if (type === "firewall") {
      device.config.interfaces[0] = { ...device.config.interfaces[0], ip: "192.168.1.1", mask: "255.255.255.0", status: "up" };
    }
    if (type === "server") {
      device.dnsRecords = [
        { name: "server.netlab", ip: "" },
      ];
      device.services = defaultServices();
    }
    if (type === "cloud") device.services = defaultServices();
    this.devices.push(device);
    return device;
  }

  removeDevice(id: string) {
    this.pushHistory();
    this.devices = this.devices.filter((d) => d.id !== id);
    this.cables = this.cables.filter((c) => c.fromDevice !== id && c.toDevice !== id);
  }

  moveDevice(id: string, x: number, y: number) {
    const d = this.devices.find((x) => x.id === id);
    if (d) {
      d.x = x;
      d.y = y;
    }
  }

  /** Duplicate a device (fresh id + MAC) offset by (dx, dy). Cables are not copied. */
  duplicateDevice(id: string, dx = 32, dy = 32): Device | null {
    const d = this.devices.find((x) => x.id === id);
    if (!d) return null;
    this.pushHistory();
    const clone: Device = {
      ...JSON.parse(JSON.stringify(d)),
      id: nid(),
      x: d.x + dx,
      y: d.y + dy,
      config: {
        ...JSON.parse(JSON.stringify(d.config)),
        name: `${d.config.name} (copy)`,
        hostname: `${d.config.hostname}-c`,
        mac: randomCloneMac(),
      },
    };
    this.devices.push(clone);
    this.wirelessLinks = computeWirelessLinks(this.devices);
    return clone;
  }

  /** Rotate a device 90° clockwise. */
  rotateDevice(id: string) {
    const d = this.devices.find((x) => x.id === id);
    if (!d) return;
    this.pushHistory();
    d.rotation = ((d.rotation ?? 0) + 90) % 360;
  }

  /** Remove every cable attached to a device (keeps the device itself). */
  disconnectDevice(id: string) {
    if (!this.devices.some((x) => x.id === id)) return;
    this.pushHistory();
    this.cables = this.cables.filter((c) => c.fromDevice !== id && c.toDevice !== id);
  }

  updateDeviceConfig(id: string, patch: Partial<Device["config"]>): { ok: boolean; error?: string } {
    const d = this.devices.find((x) => x.id === id);
    if (!d) return { ok: false, error: "Device not found." };
    this.pushHistory();
    d.config = { ...d.config, ...patch };
    this.wirelessLinks = computeWirelessLinks(this.devices);
    return { ok: true };
  }

  setInterfaceIp(id: string, portId: string, ip?: string, mask?: string): { ok: boolean; error?: string } {
    const d = this.devices.find((x) => x.id === id);
    if (!d) return { ok: false, error: "Device not found." };
    const iface = d.config.interfaces.find((i) => i.id === portId);
    if (!iface) return { ok: false, error: "Interface not found." };
    this.pushHistory();
    iface.ip = ip;
    iface.mask = mask;
    if (ip && !mask) iface.mask = ip.startsWith("10.") ? "255.0.0.0" : ip.startsWith("172.") ? "255.255.0.0" : "255.255.255.0";
    return { ok: true };
  }

  toggleInterface(id: string, portId: string): Device | null {
    const d = this.devices.find((x) => x.id === id);
    if (!d) return null;
    this.pushHistory();
    const iface = d.config.interfaces.find((i) => i.id === portId);
    if (iface) iface.status = iface.status === "up" ? "down" : "up";
    return d;
  }

  addRoute(id: string, network: string, mask: string, nextHop: string): { ok: boolean; error?: string } {
    const d = this.devices.find((x) => x.id === id);
    if (!d || !(d.type === "router" || d.type === "wirelessRouter" || d.type === "firewall")) {
      return { ok: false, error: "Only routers can hold routes." };
    }
    if (!nextHop) return { ok: false, error: "A next-hop IP is required." };
    this.pushHistory();
    d.routes.push({ id: nid(), network, mask, nextHop });
    return { ok: true };
  }

  removeRoute(id: string, routeId: string) {
    const d = this.devices.find((x) => x.id === id);
    if (!d) return;
    this.pushHistory();
    d.routes = d.routes.filter((r) => r.id !== routeId);
  }

  setDhcpPool(id: string, start: string, end: string) {
    const d = this.devices.find((x) => x.id === id);
    if (!d || d.type !== "server") return;
    this.pushHistory();
    d.dhcpPool = start && end ? { start, end } : null;
  }

  addDnsRecord(id: string, name: string, ip: string): { ok: boolean; error?: string } {
    const d = this.devices.find((x) => x.id === id);
    if (!d || d.type !== "server") return { ok: false, error: "Only servers hold DNS records." };
    if (!name || !ip) return { ok: false, error: "Name and IP are required." };
    this.pushHistory();
    d.dnsRecords = d.dnsRecords ?? [];
    d.dnsRecords = d.dnsRecords.filter((r) => r.name !== name);
    d.dnsRecords.push({ name, ip });
    return { ok: true };
  }

  /** Start/stop a hosted software service. Missing state = every service on. */
  setServiceState(id: string, service: ServerServiceKey, on: boolean): { ok: boolean; error?: string } {
    const d = this.devices.find((x) => x.id === id);
    if (!d) return { ok: false, error: "Device not found." };
    if (!(d.type === "server" || d.type === "cloud")) return { ok: false, error: "Only servers host services." };
    this.pushHistory();
    if (!d.services) d.services = Object.fromEntries(SERVER_SERVICE_KEYS.map((k) => [k, true])) as ServerServices;
    d.services[service] = on;
    return { ok: true };
  }

  // ----------------------------------------------------------------- cables
  connect(fromId: string, fromPort: string, toId: string, toPort: string, type: CableType): ConnectResult {
    if (fromId === toId) return { ok: false, error: "A device can't connect to itself." };
    const fromDev = this.devices.find((d) => d.id === fromId);
    const toDev = this.devices.find((d) => d.id === toId);
    if (!fromDev || !toDev) return { ok: false, error: "Device not found." };

    const check = evaluateCable(type, fromDev, toDev);
    if (!check.ok) return { ok: false, error: check.error };

    // Each port hosts at most one cable.
    const clash = this.cables.find((c) => (c.fromDevice === fromId && c.fromPort === fromPort) || (c.toDevice === toId && c.toPort === toPort));
    if (clash) return { ok: false, error: "That port is already in use." };

    this.pushHistory();
    const cable: Cable = { id: nid(), type, fromDevice: fromId, fromPort, toDevice: toId, toPort };
    this.cables.push(cable);
    return { ok: true, cable };
  }

  removeCable(id: string) {
    this.pushHistory();
    this.cables = this.cables.filter((c) => c.id !== id);
  }

  cableState(id: string) {
    const c = this.cables.find((x) => x.id === id);
    if (!c) return "error" as const;
    return cableStatus(c, this.devices);
  }

  // ------------------------------------------------------------------- sim
  runPacket(run: PacketRun): TraceResult {
    const result = runPacket(this.netSnapshot(), run);
    this.record(result);
    return result;
  }

  ping(sourceId: string, target: string): TraceResult {
    const result = runPacket(this.netSnapshot(), { sourceId, target, type: "icmp" });
    this.record(result);
    return result;
  }

  diagnose(sourceId: string, target: string) {
    return diagnose(this.netSnapshot(), sourceId, target);
  }

  dhcp(deviceId: string) {
    const result = dhcpAssign(this.netSnapshot(), deviceId);
    if (result.ok && result.device) this.applyDevice(result.device);
    return result;
  }

  /** Feed a trace into live stats + the timeline. Called automatically by
   * ping/runPacket; the engine stays pure so server re-validation is unaffected. */
  record(result: TraceResult) {
    const now = Date.now();
    const byId = new Map(this.devices.map((d) => [d.id, d]));
    const protocol = traceProtocol(result);
    const events: TimelineEvent[] = [];

    for (let i = 0; i < result.steps.length; i++) {
      const s = result.steps[i];
      this.bump(s.deviceId, protocol, s.cableId, s.status === "fail" ? 1 : 0);
      events.push({
        id: `ev-${now}-${i}`,
        at: now + i,
        protocol,
        deviceId: s.deviceId,
        deviceLabel: s.deviceLabel ?? byId.get(s.deviceId)?.config.hostname ?? s.deviceId,
        action: s.action,
        detail: s.detail,
        ok: s.status !== "fail",
      });
    }
    this.events = [...this.events, ...events].slice(-400);
  }

  private bump(deviceId: string, protocol: ProtocolName, cableId?: string, dropped = 0) {
    const d = this.devices.find((x) => x.id === deviceId);
    if (!d) return;
    const st = (this.stats[deviceId] ??= { tx: 0, rx: 0, dropped: 0, byProtocol: {}, ports: {} });
    st.rx += 1;
    st.dropped += dropped;
    st.byProtocol[protocol] = (st.byProtocol[protocol] ?? 0) + 1;
    const port = cableId ? this.cablePort(d.id, cableId) : d.config.interfaces.find((i) => i.status === "up")?.id;
    if (port) {
      const ps = (st.ports[port] ??= { rxPkts: 0, txPkts: 0, rxBytes: 0, txBytes: 0, errors: 0 });
      ps.rxPkts += 1;
      ps.rxBytes += 64;
      ps.errors += dropped;
    }
    if (cableId) {
      const other = this.cablePeer(d.id, cableId);
      if (other) {
        const ost = (this.stats[other.id] ??= { tx: 0, rx: 0, dropped: 0, byProtocol: {}, ports: {} });
        ost.tx += 1;
        ost.byProtocol[protocol] = (ost.byProtocol[protocol] ?? 0) + 1;
        const op = this.cablePort(other.id, cableId);
        if (op) {
          const ops = (ost.ports[op] ??= { rxPkts: 0, txPkts: 0, rxBytes: 0, txBytes: 0, errors: 0 });
          ops.txPkts += 1;
          ops.txBytes += 64;
        }
      }
    }
  }

  private cablePort(deviceId: string, cableId: string): string | null {
    const c = this.cables.find((x) => x.id === cableId);
    if (!c) return null;
    if (c.fromDevice === deviceId) return c.fromPort;
    if (c.toDevice === deviceId) return c.toPort;
    return null;
  }

  private cablePeer(deviceId: string, cableId: string): Device | null {
    const c = this.cables.find((x) => x.id === cableId);
    if (!c) return null;
    const other = c.fromDevice === deviceId ? c.toDevice : c.toDevice === deviceId ? c.fromDevice : null;
    if (!other) return null;
    return this.devices.find((d) => d.id === other) ?? null;
  }

  /** Enable or disable a service on a server (affects the whole simulation). */
  setService(id: string, key: ServerServiceKey, on: boolean) {
    const d = this.devices.find((x) => x.id === id);
    if (!d || (d.type !== "server" && d.type !== "cloud")) return;
    this.pushHistory();
    d.services = { ...(d.services ?? defaultServices()), [key]: on };
    this.wirelessLinks = computeWirelessLinks(this.devices);
  }

  /** Change wireless security settings (SSID / password / encryption / channel). */
  setWlanSecurity(id: string, patch: Partial<WlanConfig>) {
    const d = this.devices.find((x) => x.id === id);
    if (!d) return;
    this.pushHistory();
    d.config.wlan = { ssid: "NetLab", enabled: false, band: "2.4", channel: 6, encryption: "none", ...(d.config.wlan ?? {}), ...patch };
    this.wirelessLinks = computeWirelessLinks(this.devices);
  }

  saveStartupConfig(deviceId: string) {
    const d = this.devices.find((x) => x.id === deviceId);
    if (!d) return;
    this.startupConfigs[deviceId] = {
      hostname: d.config.hostname,
      interfaces: JSON.parse(JSON.stringify(d.config.interfaces)) as InterfaceConfig[],
      routes: JSON.parse(JSON.stringify(d.routes)) as StaticRoute[],
    };
  }

  // ------------------------------------------------------- canned scenarios
  loadTemplate(name: TemplateName) {
    this.load(buildTemplate(name));
  }
}

export function buildTemplate(name: TemplateName): SimSnapshot {
  const sim = new NetworkSimulator();
  sim.name = name;
  const cable = (a: { id: string; port: string }, b: { id: string; port: string }, type: CableType) => {
    sim.connect(a.id, a.port, b.id, b.port, type);
  };

  if (name === "small-lan") {
    const sw = sim.addDevice("switch", 420, 200);
    sw.config.hostname = "SW1";
    const pc1 = sim.addDevice("pc", 240, 140);
    const pc2 = sim.addDevice("pc", 600, 140);
    const srv = sim.addDevice("server", 240, 300);
    pc1.config.hostname = "PC1";
    pc2.config.hostname = "PC2";
    srv.config.hostname = "SRV1";
    cable({ id: pc1.id, port: "eth0" }, { id: sw.id, port: "eth0" }, "copperStraight");
    cable({ id: pc2.id, port: "eth0" }, { id: sw.id, port: "eth1" }, "copperStraight");
    cable({ id: srv.id, port: "eth0" }, { id: sw.id, port: "eth2" }, "copperStraight");
    srv.dhcpPool = { start: "192.168.1.50", end: "192.168.1.100" };
    srv.config.interfaces[0] = { ...srv.config.interfaces[0], ip: "192.168.1.10", mask: "255.255.255.0" };
    srv.dnsRecords = [{ name: "server.netlab", ip: "192.168.1.10" }];
  } else if (name === "two-router") {
    const r1 = sim.addDevice("router", 240, 200);
    const r2 = sim.addDevice("router", 560, 200);
    const sw1 = sim.addDevice("switch", 120, 340);
    const sw2 = sim.addDevice("switch", 680, 340);
    const pc1 = sim.addDevice("pc", 40, 460);
    const pc2 = sim.addDevice("pc", 900, 460);
    r1.config.hostname = "R1";
    r2.config.hostname = "R2";
    sw1.config.hostname = "SW1";
    sw2.config.hostname = "SW2";
    pc1.config.hostname = "PC1";
    pc2.config.hostname = "PC2";
    cable({ id: sw1.id, port: "eth0" }, { id: r1.id, port: "eth0" }, "copperStraight");
    cable({ id: sw2.id, port: "eth0" }, { id: r2.id, port: "eth0" }, "copperStraight");
    cable({ id: r1.id, port: "serial0" }, { id: r2.id, port: "serial0" }, "serial");
    cable({ id: pc1.id, port: "eth0" }, { id: sw1.id, port: "eth1" }, "copperStraight");
    cable({ id: pc2.id, port: "eth0" }, { id: sw2.id, port: "eth1" }, "copperStraight");
    r1.config.interfaces[0] = { ...r1.config.interfaces[0], ip: "192.168.1.1", mask: "255.255.255.0", status: "up" };
    r1.config.interfaces.find((i) => i.id === "serial0")!.ip = "10.0.0.1";
    r1.config.interfaces.find((i) => i.id === "serial0")!.mask = "255.255.255.252";
    r2.config.interfaces[0] = { ...r2.config.interfaces[0], ip: "192.168.2.1", mask: "255.255.255.0", status: "up" };
    r2.config.interfaces.find((i) => i.id === "serial0")!.ip = "10.0.0.2";
    r2.config.interfaces.find((i) => i.id === "serial0")!.mask = "255.255.255.252";
  } else if (name === "wifi") {
    const wr = sim.addDevice("wirelessRouter", 420, 160);
    const ap = sim.addDevice("accessPoint", 420, 300);
    const laptop = sim.addDevice("laptop", 220, 320);
    const pc = sim.addDevice("pc", 620, 180);
    wr.config.hostname = "WR1";
    ap.config.hostname = "AP1";
    laptop.config.hostname = "Laptop1";
    pc.config.hostname = "PC1";
    wr.config.interfaces[1] = { ...wr.config.interfaces[1], ip: "192.168.1.1", mask: "255.255.255.0", status: "up" };
    wr.config.interfaces[0] = { ...wr.config.interfaces[0], status: "up" };
    ap.config.wlan = { ssid: "HomeNet", enabled: true };
    laptop.config.wlan = { ssid: "HomeNet", enabled: true };
    laptop.config.interfaces[0] = { ...laptop.config.interfaces[0], ip: "192.168.1.20", mask: "255.255.255.0", status: "up" };
    laptop.config.gateway = "192.168.1.1";
    pc.config.interfaces[0] = { ...pc.config.interfaces[0], ip: "192.168.1.2", mask: "255.255.255.0", status: "up" };
    pc.config.gateway = "192.168.1.1";
    cable({ id: pc.id, port: "eth0" }, { id: wr.id, port: "eth1" }, "copperCrossover");
    cable({ id: ap.id, port: "eth0" }, { id: wr.id, port: "eth2" }, "copperStraight");
  } else if (name === "internet") {
    const cloud = sim.addDevice("cloud", 140, 140);
    const r = sim.addDevice("router", 420, 160);
    const fw = sim.addDevice("firewall", 420, 240);
    const sw = sim.addDevice("switch", 420, 340);
    const pc1 = sim.addDevice("pc", 260, 400);
    const pc2 = sim.addDevice("pc", 600, 400);
    cloud.config.hostname = "Internet";
    r.config.hostname = "R1";
    fw.config.hostname = "FW1";
    sw.config.hostname = "SW1";
    pc1.config.hostname = "PC1";
    pc2.config.hostname = "PC2";
    cable({ id: cloud.id, port: "eth0" }, { id: r.id, port: "eth0" }, "fiber");
    cable({ id: fw.id, port: "eth1" }, { id: r.id, port: "eth1" }, "copperCrossover");
    cable({ id: fw.id, port: "eth0" }, { id: sw.id, port: "eth0" }, "copperStraight");
    cable({ id: pc1.id, port: "eth0" }, { id: sw.id, port: "eth1" }, "copperStraight");
    cable({ id: pc2.id, port: "eth0" }, { id: sw.id, port: "eth2" }, "copperStraight");
    r.config.interfaces[0] = { ...r.config.interfaces[0], ip: "203.0.113.1", mask: "255.255.255.0", status: "up" };
    r.config.interfaces[1] = { ...r.config.interfaces[1], ip: "10.0.0.1", mask: "255.255.255.0", status: "up" };
    fw.config.interfaces[1] = { ...fw.config.interfaces[1], ip: "10.0.0.2", mask: "255.255.255.0", status: "up" };
    fw.config.interfaces[0] = { ...fw.config.interfaces[0], status: "up" };
    fw.config.interfaces.find((i) => i.id === "eth1")!.status = "up";
    pc1.config.interfaces[0] = { ...pc1.config.interfaces[0], ip: "192.168.1.10", mask: "255.255.255.0", status: "up" };
    pc1.config.gateway = "192.168.1.1";
    pc2.config.interfaces[0] = { ...pc2.config.interfaces[0], ip: "192.168.1.11", mask: "255.255.255.0", status: "up" };
    pc2.config.gateway = "192.168.1.1";
  } else if (name === "nos-basic") {
    // NOS: a clean managed LAN. SW1's management interface is administratively
    // down — the learner must bring it up before the switch answers pings.
    const sw = sim.addDevice("switch", 420, 240);
    const pc1 = sim.addDevice("pc", 150, 150);
    const pc2 = sim.addDevice("pc", 690, 150);
    const mgmt = sim.addDevice("pc", 420, 400);
    sw.config.hostname = "SW1";
    pc1.config.hostname = "PC1";
    pc2.config.hostname = "PC2";
    mgmt.config.hostname = "MgmtPC";
    cable({ id: pc1.id, port: "eth0" }, { id: sw.id, port: "eth0" }, "copperStraight");
    cable({ id: pc2.id, port: "eth0" }, { id: sw.id, port: "eth1" }, "copperStraight");
    cable({ id: mgmt.id, port: "eth0" }, { id: sw.id, port: "eth2" }, "copperStraight");
    sw.config.interfaces[0] = { ...sw.config.interfaces[0], status: "down" };
  } else if (name === "nos-faults") {
    // NOS: the same managed LAN, but broken in three ways. MgmtPC is healthy so
    // learners can compare a working host against the faulted ones.
    const sw = sim.addDevice("switch", 420, 240);
    const pc1 = sim.addDevice("pc", 150, 150);
    const pc2 = sim.addDevice("pc", 690, 150);
    const mgmt = sim.addDevice("pc", 420, 400);
    sw.config.hostname = "SW1";
    pc1.config.hostname = "PC1";
    pc2.config.hostname = "PC2";
    mgmt.config.hostname = "MgmtPC";
    cable({ id: pc1.id, port: "eth0" }, { id: sw.id, port: "eth0" }, "copperStraight");
    cable({ id: pc2.id, port: "eth0" }, { id: sw.id, port: "eth1" }, "copperStraight");
    cable({ id: mgmt.id, port: "eth0" }, { id: sw.id, port: "eth2" }, "copperStraight");
    sw.config.interfaces[0] = { ...sw.config.interfaces[0], status: "down" };
    pc1.config.interfaces[0] = { ...pc1.config.interfaces[0], ip: "192.168.1.200", mask: "255.255.0.0", status: "up" };
    pc2.config.interfaces[0] = { ...pc2.config.interfaces[0], ip: undefined, mask: undefined, status: "up" };
    mgmt.config.interfaces[0] = { ...mgmt.config.interfaces[0], ip: "192.168.1.100", mask: "255.255.255.0", status: "up" };
    mgmt.config.gateway = "192.168.1.1";
  } else if (name === "nos-faults-routed") {
    // NOS: routed network with a down interface on R2 and both static routes
    // missing. R1's LAN is fine, so failures trace to R2 and the routing table.
    const r1 = sim.addDevice("router", 260, 200);
    const r2 = sim.addDevice("router", 600, 200);
    const sw1 = sim.addDevice("switch", 140, 340);
    const sw2 = sim.addDevice("switch", 720, 340);
    const pc1 = sim.addDevice("pc", 50, 460);
    const pc2 = sim.addDevice("pc", 920, 460);
    r1.config.hostname = "R1";
    r2.config.hostname = "R2";
    sw1.config.hostname = "SW1";
    sw2.config.hostname = "SW2";
    pc1.config.hostname = "PC1";
    pc2.config.hostname = "PC2";
    cable({ id: sw1.id, port: "eth0" }, { id: r1.id, port: "eth0" }, "copperStraight");
    cable({ id: sw2.id, port: "eth0" }, { id: r2.id, port: "eth0" }, "copperStraight");
    cable({ id: r1.id, port: "serial0" }, { id: r2.id, port: "serial0" }, "serial");
    cable({ id: pc1.id, port: "eth0" }, { id: sw1.id, port: "eth1" }, "copperStraight");
    cable({ id: pc2.id, port: "eth0" }, { id: sw2.id, port: "eth1" }, "copperStraight");
    r1.config.interfaces[0] = { ...r1.config.interfaces[0], ip: "192.168.1.1", mask: "255.255.255.0", status: "up" };
    r1.config.interfaces.find((i) => i.id === "serial0")!.ip = "10.0.0.1";
    r1.config.interfaces.find((i) => i.id === "serial0")!.mask = "255.255.255.252";
    r1.config.interfaces.find((i) => i.id === "serial0")!.status = "up";
    r2.config.interfaces[0] = { ...r2.config.interfaces[0], ip: "192.168.2.1", mask: "255.255.255.0", status: "down" };
    r2.config.interfaces.find((i) => i.id === "serial0")!.ip = "10.0.0.2";
    r2.config.interfaces.find((i) => i.id === "serial0")!.mask = "255.255.255.252";
    r2.config.interfaces.find((i) => i.id === "serial0")!.status = "up";
    pc1.config.interfaces[0] = { ...pc1.config.interfaces[0], ip: "192.168.1.10", mask: "255.255.255.0", status: "up" };
    pc1.config.gateway = "192.168.1.1";
    pc2.config.interfaces[0] = { ...pc2.config.interfaces[0], ip: "192.168.2.10", mask: "255.255.255.0", status: "up" };
    pc2.config.gateway = "192.168.2.1";
  } else if (name === "nos-capstone") {
    // NOS capstone: two sites, two routers over a serial link, and a two-VLAN
    // access layer at Site A (staff VLAN 10 + isolated guest VLAN 20).
    const swA = sim.addDevice("switch", 300, 300);
    const swB = sim.addDevice("switch", 780, 300);
    const r1 = sim.addDevice("router", 540, 140);
    const r2 = sim.addDevice("router", 540, 460);
    const pc1 = sim.addDevice("pc", 60, 180);
    const pc2 = sim.addDevice("pc", 60, 420);
    const mgmt = sim.addDevice("pc", 300, 60);
    const pc3 = sim.addDevice("pc", 1020, 180);
    const pc4 = sim.addDevice("pc", 1020, 420);
    swA.config.hostname = "SW-A";
    swB.config.hostname = "SW-B";
    r1.config.hostname = "R1";
    r2.config.hostname = "R2";
    pc1.config.hostname = "PC1";
    pc2.config.hostname = "PC2";
    mgmt.config.hostname = "MgmtPC";
    pc3.config.hostname = "PC3";
    pc4.config.hostname = "PC4";
    cable({ id: pc1.id, port: "eth0" }, { id: swA.id, port: "eth1" }, "copperStraight");
    cable({ id: pc2.id, port: "eth0" }, { id: swA.id, port: "eth2" }, "copperStraight");
    cable({ id: mgmt.id, port: "eth0" }, { id: swA.id, port: "eth3" }, "copperStraight");
    cable({ id: swA.id, port: "eth0" }, { id: r1.id, port: "eth0" }, "copperStraight");
    cable({ id: r1.id, port: "serial0" }, { id: r2.id, port: "serial0" }, "serial");
    cable({ id: swB.id, port: "eth0" }, { id: r2.id, port: "eth0" }, "copperStraight");
    cable({ id: pc3.id, port: "eth0" }, { id: swB.id, port: "eth1" }, "copperStraight");
    cable({ id: pc4.id, port: "eth0" }, { id: swB.id, port: "eth2" }, "copperStraight");
    r1.config.interfaces[0] = { ...r1.config.interfaces[0], ip: "192.168.1.1", mask: "255.255.255.0", status: "up" };
    r1.config.interfaces.find((i) => i.id === "serial0")!.ip = "10.0.0.1";
    r1.config.interfaces.find((i) => i.id === "serial0")!.mask = "255.255.255.252";
    r1.config.interfaces.find((i) => i.id === "serial0")!.status = "up";
    r2.config.interfaces[0] = { ...r2.config.interfaces[0], ip: "192.168.2.1", mask: "255.255.255.0", status: "down" };
    r2.config.interfaces.find((i) => i.id === "serial0")!.ip = "10.0.0.2";
    r2.config.interfaces.find((i) => i.id === "serial0")!.mask = "255.255.255.252";
    r2.config.interfaces.find((i) => i.id === "serial0")!.status = "up";
    pc1.config.interfaces[0] = { ...pc1.config.interfaces[0], ip: "192.168.1.10", mask: "255.255.255.0", status: "up" };
    pc1.config.gateway = "192.168.1.1";
    pc2.config.interfaces[0] = { ...pc2.config.interfaces[0], ip: "192.168.1.11", mask: "255.255.255.0", status: "up" };
    pc2.config.gateway = "192.168.1.1";
    mgmt.config.interfaces[0] = { ...mgmt.config.interfaces[0], ip: "192.168.1.100", mask: "255.255.255.0", status: "up" };
    mgmt.config.gateway = "192.168.1.1";
    pc3.config.interfaces[0] = { ...pc3.config.interfaces[0], ip: "192.168.2.10", mask: "255.255.255.0", status: "up" };
    pc3.config.gateway = "192.168.2.1";
    pc4.config.interfaces[0] = { ...pc4.config.interfaces[0], ip: "192.168.3.50", mask: "255.255.255.0", status: "up" };
    pc4.config.gateway = "192.168.3.1";
  }

  return sim.snapshot;
}

/** Simple reachability snapshot for tests/templates: which IPs exist. */
export function interfaceSummary(d: Device): string[] {
  return d.config.interfaces.map((i) => `${i.label ?? i.id}: ${i.ip ?? "unassigned"}/${i.mask ? maskToBits(i.mask) : "-"}`);
}

/** Which protocol a TraceResult represents, for stats + the timeline. */
function traceProtocol(result: TraceResult): ProtocolName {
  const arpStep = result.steps.find((s) => s.action.includes("ARP") && s.status === "fail");
  if (result.type === "icmp") return arpStep ? "ARP" : "ICMP";
  if (result.type === "dhcp") return "DHCP";
  if (result.type === "dns") return "DNS";
  if (result.type === "http") return "HTTP";
  if (result.type === "ftp") return "FTP";
  return "ICMP";
}
