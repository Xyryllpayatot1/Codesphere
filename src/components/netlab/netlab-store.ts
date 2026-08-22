"use client";

import { create } from "zustand";
import { NetworkSimulator, buildTemplate, type TemplateName } from "@/lib/net/sim";
import { buildTopology, type TopologyKey } from "@/lib/net/topology";
import { getMission, missionStart } from "@/lib/net/missions";
import { runCommand, type CliContext, type CmdLine } from "@/lib/net/commands";
import { cableTip, connectionExplanation, pingFailureExplanation, type TeachingNote } from "@/lib/net/explain";
import { CABLE_TYPES } from "@/lib/net/types";
import { DEVICE_TYPES } from "@/lib/net/devices";
import type { CableType, Device, PacketType, ServerServiceKey, SimSnapshot, TraceResult, WlanConfig } from "@/lib/net/types";
import { randomMac } from "@/lib/net/ip";
import { toast } from "@/store/use-toast";
import { traceAnimations, type Burst, type PacketAnim } from "./animations";
import type { RoomEvent } from "@/lib/rooms/types";

export type NetTool = "select" | "cable" | "delete" | "ping";
export type NetMode = "mission" | "sandbox";

export type CmdLineKind = "in" | "out";
export type CmdSessionLine = { text: string; kind: CmdLineKind; status?: CmdLine["status"] };
export type CmdSession = {
  deviceId: string;
  lines: CmdSessionLine[];
  busy: boolean;
  history: string[];
};

export type CmdLogEntry = {
  id: string;
  at: string;
  device: string;
  command: string;
  result: string;
  reason?: string;
  ok: boolean;
};

export type MissionCheck = { ok: boolean; message: string; hints: string[] };

export type ContextMenuState = { x: number; y: number; deviceId: string } | null;

export const GRID = 20;

type NetlabState = {
  sim: NetworkSimulator;
  version: number;
  mode: NetMode;
  tool: NetTool;
  cableType: CableType;
  cableFrom: { deviceId: string; portId: string } | null;
  selectedDeviceId: string | null;
  hoverDeviceId: string | null;
  pingSourceId: string | null;
  pan: { x: number; y: number };
  zoom: number;
  gridSnap: boolean;
  trace: TraceResult | null;
  diagnosis: { step: string; message: string; hint: string } | null;
  cmd: CmdSession | null;
  cmdLog: CmdLogEntry[];
  /** Per-device IOS privilege context so multi-step config survives between commands. */
  cliCtxs: Record<string, CliContext>;
  missionSlug: string | null;
  missionCheck: MissionCheck | null;
  projectId: string | null;
  projectTitle: string;
  dirty: boolean;

  configDeviceId: string | null;
  configTab: string;
  contextMenu: ContextMenuState;
  clipboard: { devices: Device[] } | null;
  missionPanelOpen: boolean;
  missionPickerOpen: boolean;
  learn: TeachingNote | null;
  packets: PacketAnim[];
  bursts: Burst[];

  // ─── collaboration bridge ──────────────────────────────────────────────
  /** Set by the collab store while a room is joined; every local edit is
   *  forwarded here so it can be posted to the room. Null outside a room. */
  collabEmitter: ((event: RoomEvent) => void) | null;
  setCollabEmitter: (fn: ((event: RoomEvent) => void) | null) => void;
  /** Apply a workspace event received from a peer to the local sim. */
  applyRemoteEvent: (event: RoomEvent) => void;

  refresh: () => void;
  init: (snapshot: SimSnapshot | null, opts?: { projectId?: string | null; title?: string; missionSlug?: string | null }) => void;
  newCanvas: () => void;
  loadTemplate: (name: TemplateName) => void;
  loadTopology: (name: TopologyKey) => void;
  startMission: (slug: string) => void;
  exitMission: () => void;
  checkMission: () => void;

  setMode: (mode: NetMode) => void;
  setMissionPickerOpen: (open: boolean) => void;
  toggleMissionPanel: () => void;

  addDevice: (type: Device["type"]) => void;
  addDeviceAt: (type: Device["type"], x: number, y: number) => void;
  removeDevice: (id: string) => void;
  moveDevice: (id: string, x: number, y: number) => void;
  snapDevice: (id: string) => void;
  select: (id: string | null) => void;
  setHover: (id: string | null) => void;
  setPingSource: (id: string) => void;
  setTool: (t: NetTool) => void;
  setCableType: (t: CableType) => void;
  armCable: (deviceId: string, portId?: string) => void;
  disarmCable: () => void;
  connectDevices: (fromId: string, toId: string) => void;
  removeCable: (cableId: string) => void;
  undo: () => void;

  setGridSnap: (b: boolean) => void;
  setLearn: (note: TeachingNote | null) => void;

  openConfig: (deviceId: string, tab?: string) => void;
  closeConfig: () => void;
  setConfigTab: (tab: string) => void;
  openContextMenu: (x: number, y: number, deviceId: string) => void;
  closeContextMenu: () => void;
  renameDevice: (id: string, name: string) => void;
  rotateDevice: (id: string) => void;
  duplicateDevice: (id: string) => void;
  copyDevice: (id: string) => void;
  paste: () => void;
  disconnectDevice: (id: string) => void;

  setInterfaceIp: (deviceId: string, portId: string, ip: string, mask: string) => void;
  toggleInterface: (deviceId: string, portId: string) => void;
  setHostname: (deviceId: string, hostname: string) => void;
  setDhcp: (deviceId: string, dhcp: boolean) => void;
  setGateway: (deviceId: string, gateway: string) => void;
  setDns: (deviceId: string, dns: string) => void;
  renewDhcp: (deviceId: string) => void;
  setWlan: (deviceId: string, patch: Partial<WlanConfig>) => void;
  setDhcpPool: (deviceId: string, start: string, end: string) => void;
  setDnsRecord: (deviceId: string, name: string, ip: string) => void;
  setServiceState: (deviceId: string, service: ServerServiceKey, on: boolean) => void;
  addRoute: (deviceId: string, network: string, mask: string, nextHop: string) => void;
  removeRoute: (deviceId: string, routeId: string) => void;

  runPing: (sourceId: string, target: string) => void;
  runPacket: (sourceId: string, target: string, type: PacketType) => void;
  runDiagnose: (sourceId: string, target: string) => void;
  tickAnimations: (now: number) => void;

  openCmd: (deviceId: string) => void;
  closeCmd: () => void;
  clearCmd: () => void;
  clearCmdLog: () => void;
  runCmd: (deviceId: string, raw: string) => Promise<void>;
  togglePower: (deviceId: string) => void;

  setPan: (pan: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;

  saveProject: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  exportJson: () => void;
  importJson: (text: string) => void;
};

function usedPorts(sim: NetworkSimulator): Set<string> {
  const used = new Set<string>();
  for (const c of sim.cables) {
    used.add(`${c.fromDevice}::${c.fromPort}`);
    used.add(`${c.toDevice}::${c.toPort}`);
  }
  return used;
}

const snap = (v: number) => Math.round(v / GRID) * GRID;

/** Throttle DEVICE_MOVED broadcasts during a drag; the final snapped position
 *  (fired from snapDevice on pointer-up) is always sent. */
const moveEmitThrottle = new Map<string, number>();
const MOVE_EMIT_MS = 120;

export const useNetlab = create<NetlabState>((set, get) => {
  const freshSim = () => new NetworkSimulator();

  return {
    sim: freshSim(),
    version: 0,
    mode: "mission",
    tool: "select",
    cableType: "copperStraight",
    cableFrom: null,
    selectedDeviceId: null,
    hoverDeviceId: null,
    pingSourceId: null,
    pan: { x: 60, y: 40 },
    zoom: 1,
    gridSnap: true,
    trace: null,
    diagnosis: null,
    cmd: null,
    cmdLog: [],
    cliCtxs: {},
    missionSlug: null,
    missionCheck: null,
    projectId: null,
    projectTitle: "My Network",
    dirty: false,

    configDeviceId: null,
    configTab: "general",
    contextMenu: null,
    clipboard: null,
    missionPanelOpen: false,
    missionPickerOpen: false,
    learn: null,
    packets: [],
    bursts: [],

    collabEmitter: null,
    setCollabEmitter: (fn) => set((s) => ({ ...s, collabEmitter: fn })),

    refresh: () => set((s) => ({ ...s, version: s.version + 1, dirty: true })),

    init: (snapshot, opts) =>
      set((s) => ({
        ...s,
        sim: snapshot ? new NetworkSimulator(snapshot) : freshSim(),
        version: s.version + 1,
        selectedDeviceId: null,
        hoverDeviceId: null,
        pingSourceId: null,
        trace: null,
        diagnosis: null,
        cmd: null,
        cmdLog: [],
        cliCtxs: {},
        missionSlug: opts?.missionSlug ?? null,
        missionCheck: null,
        projectId: opts?.projectId ?? null,
        projectTitle: opts?.title ?? "My Network",
        dirty: false,
        configDeviceId: null,
        contextMenu: null,
        missionPanelOpen: false,
        missionPickerOpen: false,
        learn: null,
        packets: [],
        bursts: [],
      })),

    newCanvas: () => {
      get().init(null, { title: "My Network" });
      get().collabEmitter?.({ type: "WORKSPACE_SYNC", snapshot: get().sim.snapshot });
    },

    loadTemplate: (name) => {
      get().init(buildTemplate(name), { title: name.replace("-", " ").toUpperCase() });
      toast({ title: "Template loaded", description: name.replace("-", " "), variant: "info" });
      get().collabEmitter?.({ type: "WORKSPACE_SYNC", snapshot: get().sim.snapshot });
    },

    loadTopology: (name) => {
      const t = buildTopology(name);
      get().init(t, { title: t.devices[0]?.config.name ?? name, missionSlug: get().missionSlug });
      toast({ title: "Topology loaded", description: name, variant: "info" });
      get().collabEmitter?.({ type: "WORKSPACE_SYNC", snapshot: get().sim.snapshot });
    },

    startMission: (slug) => {
      const m = getMission(slug);
      if (!m) return;
      get().init(missionStart(m), { title: m.title, missionSlug: slug });
      set((s) => ({ ...s, mode: "mission", missionPickerOpen: false }));
      toast({ title: "Mission started", description: m.short, variant: "info" });
      get().collabEmitter?.({ type: "WORKSPACE_SYNC", snapshot: get().sim.snapshot });
    },

    exitMission: () => {
      get().init(null, { title: "My Network" });
      get().collabEmitter?.({ type: "WORKSPACE_SYNC", snapshot: get().sim.snapshot });
    },

    checkMission: () => {
      const slug = get().missionSlug;
      if (!slug) return;
      const m = getMission(slug);
      if (!m) return;
      const res = m.verify(get().sim);
      set((s) => ({ ...s, missionCheck: res }));
    },

    setMode: (mode) =>
      set((s) => ({
        ...s,
        mode,
        missionSlug: mode === "sandbox" ? null : s.missionSlug,
        missionCheck: mode === "sandbox" ? null : s.missionCheck,
        missionPanelOpen: false,
        missionPickerOpen: false,
        learn: mode === "sandbox" ? { title: "Sandbox mode", body: "No objectives, no XP. Build anything you like — every device and cable is unlimited.", kind: "info" } : s.learn,
      })),

    setMissionPickerOpen: (open) => set((s) => ({ ...s, missionPickerOpen: open })),

    toggleMissionPanel: () => set((s) => ({ ...s, missionPanelOpen: !s.missionPanelOpen })),

    addDevice: (type) => {
      const { sim, pan, zoom } = get();
      const base = 40 + Math.min(sim.devices.length, 6) * 18;
      const jitter = ((sim.devices.length % 3) - 1) * 30;
      const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
      const x = Math.max(20, (cx - pan.x - 80) / zoom + jitter);
      const y = Math.max(20, 90 + base);
      get().addDeviceAt(type, x, y);
    },

    addDeviceAt: (type, x, y) => {
      const g = get();
      const px = g.gridSnap ? snap(Math.max(0, x)) : Math.max(0, x);
      const py = g.gridSnap ? snap(Math.max(0, y)) : Math.max(0, y);
      const d = g.sim.addDevice(type, px, py);
      set((s) => ({ ...s, selectedDeviceId: d.id, tool: "select", cableFrom: null, version: s.version + 1, dirty: true }));
      g.collabEmitter?.({ type: "DEVICE_CREATED", device: d });
    },

    removeDevice: (id) => {
      const { sim, selectedDeviceId, pingSourceId, configDeviceId } = get();
      sim.removeDevice(id);
      set((s) => ({
        ...s,
        version: s.version + 1,
        dirty: true,
        selectedDeviceId: selectedDeviceId === id ? null : selectedDeviceId,
        pingSourceId: pingSourceId === id ? null : pingSourceId,
        cableFrom: s.cableFrom?.deviceId === id ? null : s.cableFrom,
        configDeviceId: configDeviceId === id ? null : configDeviceId,
        contextMenu: s.contextMenu?.deviceId === id ? null : s.contextMenu,
      }));
      get().collabEmitter?.({ type: "DEVICE_DELETED", deviceId: id });
    },

    moveDevice: (id, x, y) => {
      get().sim.moveDevice(id, x, y);
      set((s) => ({ ...s, version: s.version + 1 }));
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const last = moveEmitThrottle.get(id) ?? 0;
      if (now - last >= MOVE_EMIT_MS) {
        moveEmitThrottle.set(id, now);
        get().collabEmitter?.({ type: "DEVICE_MOVED", deviceId: id, x, y });
      }
    },

    snapDevice: (id) => {
      const sim = get().sim;
      const d = sim.devices.find((x) => x.id === id);
      if (!d || !get().gridSnap) return;
      const x = snap(d.x);
      const y = snap(d.y);
      sim.moveDevice(id, x, y);
      set((s) => ({ ...s, version: s.version + 1 }));
      get().collabEmitter?.({ type: "DEVICE_MOVED", deviceId: id, x, y });
    },

    select: (id) => set((s) => ({ ...s, selectedDeviceId: id })),

    setHover: (id) => {
      if (get().hoverDeviceId !== id) set((s) => ({ ...s, hoverDeviceId: id }));
    },

    setPingSource: (id) => set((s) => ({ ...s, pingSourceId: id, tool: "select" })),

    setTool: (t) => set((s) => ({ ...s, tool: t, cableFrom: null, contextMenu: null })),

    setCableType: (t) => set((s) => ({ ...s, cableType: t })),

    armCable: (deviceId, portId) => {
      const { cableFrom, sim, cableType } = get();
      if (cableFrom && cableFrom.deviceId !== deviceId) {
        get().connectDevices(cableFrom.deviceId, deviceId);
        return;
      }
      const d = sim.devices.find((x) => x.id === deviceId);
      if (!d) return;
      const used = usedPorts(sim);
      const kind = CABLE_TYPES[cableType].portKind;
      const free = (i: Device["config"]["interfaces"][number]) => !used.has(`${deviceId}::${i.id}`);
      const port =
        d.config.interfaces.find((i) => i.id === portId && free(i)) ??
        d.config.interfaces.find((i) => free(i) && i.kind === kind) ??
        d.config.interfaces.find((i) => free(i));
      set((s) => ({ ...s, cableFrom: { deviceId, portId: port?.id ?? d.config.interfaces[0]?.id ?? "eth0" } }));
    },

    disarmCable: () => set((s) => ({ ...s, cableFrom: null })),

    connectDevices: (fromId, toId) => {
      const { sim, cableType } = get();
      const from = sim.devices.find((d) => d.id === fromId);
      const to = sim.devices.find((d) => d.id === toId);
      if (!from || !to) return;
      if (fromId === toId) {
        set((s) => ({
          ...s,
          cableFrom: null,
          learn: { title: "Cannot connect a device to itself", body: "Pick two different devices to connect.", kind: "error" },
        }));
        return;
      }
      const used = usedPorts(sim);
      const kind = CABLE_TYPES[cableType].portKind;
      const pick = (d: Device) => {
        const ifaces = d.config.interfaces.filter((i) => !used.has(`${d.id}::${i.id}`));
        return ifaces.find((i) => i.kind === kind) ?? ifaces[0];
      };
      const fp = pick(from);
      const tp = pick(to);
      if (!fp || !tp) {
        set((s) => ({
          ...s,
          cableFrom: null,
          learn: { title: "No free port", body: "Every port on one of these devices is already used. Disconnect a cable first, or add another device.", kind: "error" },
        }));
        return;
      }
      const res = sim.connect(from.id, fp.id, to.id, tp.id, cableType);
      const note = connectionExplanation(from, to, cableType, res.ok, res.error);
      set((s) => ({ ...s, version: s.version + 1, cableFrom: null, dirty: true, learn: note }));
      if (res.ok) {
        toast({ title: "Connected", description: `${from.config.hostname} to ${to.config.hostname} (${CABLE_TYPES[cableType].label})`, variant: "success" });
        if (res.cable) {
          get().collabEmitter?.({
            type: "CABLE_CREATED",
            cableId: res.cable.id,
            cableType,
            fromDevice: from.id,
            fromPort: fp.id,
            toDevice: to.id,
            toPort: tp.id,
          });
        }
      } else {
        toast({ title: "Cable rejected", description: `${res.error ?? "Incompatible."} ${cableTip(cableType)}`, variant: "error" });
      }
    },

    removeCable: (cableId) => {
      get().sim.removeCable(cableId);
      set((s) => ({ ...s, version: s.version + 1, dirty: true }));
      get().collabEmitter?.({ type: "CABLE_REMOVED", cableId });
    },

    undo: () => {
      if (get().sim.undo()) {
        set((s) => ({ ...s, version: s.version + 1, dirty: true, trace: null, diagnosis: null, packets: [], bursts: [] }));
        get().collabEmitter?.({ type: "WORKSPACE_SYNC", snapshot: get().sim.snapshot });
      } else {
        toast({ title: "Nothing to undo", variant: "info" });
      }
    },

    setGridSnap: (b) => set((s) => ({ ...s, gridSnap: b })),

    setLearn: (note) => set((s) => ({ ...s, learn: note })),

    openConfig: (deviceId, tab) => {
      const d = get().sim.devices.find((x) => x.id === deviceId);
      if (!d) return;
      set((s) => ({ ...s, configDeviceId: deviceId, configTab: tab ?? "general", contextMenu: null }));
    },

    closeConfig: () => set((s) => ({ ...s, configDeviceId: null })),

    setConfigTab: (tab) => set((s) => ({ ...s, configTab: tab })),

    openContextMenu: (x, y, deviceId) => set((s) => ({ ...s, contextMenu: { x, y, deviceId } })),

    closeContextMenu: () => set((s) => ({ ...s, contextMenu: null })),

    renameDevice: (id, name) => {
      if (!name.trim()) return;
      get().sim.updateDeviceConfig(id, { hostname: name.trim(), name: name.trim() });
      get().refresh();
      set((s) => ({ ...s, contextMenu: null }));
      get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId: id, patch: { hostname: name.trim() } });
    },

    rotateDevice: (id) => {
      get().sim.rotateDevice(id);
      set((s) => ({
        ...s,
        version: s.version + 1,
        dirty: true,
        contextMenu: null,
        learn: { title: "Device rotated", body: "Rotating moves the connection port to another side of the device.", kind: "info" },
      }));
      const d = get().sim.devices.find((x) => x.id === id);
      if (d) get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId: id, patch: { rotation: d.rotation } });
    },

    duplicateDevice: (id) => {
      const d = get().sim.duplicateDevice(id);
      if (!d) return;
      set((s) => ({
        ...s,
        selectedDeviceId: d.id,
        version: s.version + 1,
        dirty: true,
        contextMenu: null,
        learn: { title: "Duplicated", body: `${d.config.name} was placed right next to the original.`, kind: "info" },
      }));
      get().collabEmitter?.({ type: "DEVICE_CREATED", device: d });
    },

    copyDevice: (id) => {
      const d = get().sim.devices.find((x) => x.id === id);
      if (!d) return;
      set((s) => ({
        ...s,
        clipboard: { devices: [JSON.parse(JSON.stringify(d))] },
        contextMenu: null,
        learn: { title: `${d.config.hostname} copied`, body: "Press Ctrl+V (or use Paste) to place a copy.", kind: "info" },
      }));
    },

    paste: () => {
      const clip = get().clipboard;
      if (!clip || clip.devices.length === 0) return;
      const sim = get().sim;
      let lastId: string | null = null;
      for (const src of clip.devices) {
        const fresh = sim.addDevice(src.type, src.x + 32, src.y + 32);
        const cfg = JSON.parse(JSON.stringify(src.config));
        cfg.mac = randomMac();
        cfg.name = `${cfg.name} (copy)`;
        cfg.hostname = `${cfg.hostname}-c`;
        sim.updateDeviceConfig(fresh.id, cfg);
        fresh.routes = JSON.parse(JSON.stringify(src.routes ?? []));
        fresh.dhcpPool = src.dhcpPool ? { ...src.dhcpPool } : null;
        fresh.dnsRecords = src.dnsRecords ? JSON.parse(JSON.stringify(src.dnsRecords)) : undefined;
        fresh.rotation = src.rotation ?? 0;
        lastId = fresh.id;
        get().collabEmitter?.({ type: "DEVICE_CREATED", device: fresh });
      }
      set((s) => ({
        ...s,
        selectedDeviceId: lastId,
        version: s.version + 1,
        dirty: true,
        learn: { title: "Pasted", body: `Placed ${clip.devices.length} device${clip.devices.length > 1 ? "s" : ""} from the clipboard.`, kind: "info" },
      }));
    },

    disconnectDevice: (id) => {
      const sim = get().sim;
      const d = sim.devices.find((x) => x.id === id);
      if (!d) return;
      const removed = sim.cables.filter((c) => c.fromDevice === id || c.toDevice === id).map((c) => c.id);
      sim.disconnectDevice(id);
      set((s) => ({
        ...s,
        version: s.version + 1,
        dirty: true,
        contextMenu: null,
        learn: { title: `${d.config.hostname} disconnected`, body: "All of its cables were removed. The device itself is still here.", kind: "info" },
      }));
      for (const cableId of removed) get().collabEmitter?.({ type: "CABLE_REMOVED", cableId });
    },

    setInterfaceIp: (deviceId, portId, ip, mask) => {
      get().sim.setInterfaceIp(deviceId, portId, ip || undefined, mask || undefined);
      get().refresh();
      get().collabEmitter?.({ type: "INTERFACE_UPDATED", deviceId, portId, ip: ip || undefined, mask: mask || undefined });
    },

    toggleInterface: (deviceId, portId) => {
      const d = get().sim.toggleInterface(deviceId, portId);
      get().refresh();
      const status = d?.config.interfaces.find((i) => i.id === portId)?.status;
      if (d && status) get().collabEmitter?.({ type: "INTERFACE_UPDATED", deviceId, portId, status });
    },

    setHostname: (deviceId, hostname) => {
      get().sim.updateDeviceConfig(deviceId, { hostname, name: hostname });
      get().refresh();
      get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, patch: { hostname } });
    },

    setDhcp: (deviceId, dhcp) => {
      get().sim.updateDeviceConfig(deviceId, { dhcp });
      get().refresh();
      get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, patch: { dhcp } });
    },

    setGateway: (deviceId, gateway) => {
      get().sim.updateDeviceConfig(deviceId, { gateway: gateway || undefined });
      get().refresh();
      get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, patch: { gateway: gateway || undefined } });
    },

    setDns: (deviceId, dns) => {
      get().sim.updateDeviceConfig(deviceId, { dns: dns || undefined });
      get().refresh();
      get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, patch: { dns: dns || undefined } });
    },

    renewDhcp: (deviceId) => {
      const { sim } = get();
      const res = sim.dhcp(deviceId);
      const d = sim.devices.find((x) => x.id === deviceId);
      const hostname = d?.config.hostname ?? deviceId;
      if (res.ok) {
        toast({ title: `${hostname} leased`, description: res.summary, variant: "success" });
      } else {
        toast({ title: `${hostname} DHCP failed`, description: res.error ?? res.summary, variant: "error" });
      }
      get().refresh();
      const dev = get().sim.devices.find((x) => x.id === deviceId);
      if (dev) get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, config: dev.config });
    },

    setWlan: (deviceId, patch) => {
      const { sim } = get();
      const d = sim.devices.find((x) => x.id === deviceId);
      if (!d) return;
      d.config.wlan = { ...(d.config.wlan ?? { ssid: "NetLab", enabled: false }), ...patch };
      sim.updateDeviceConfig(deviceId, { wlan: d.config.wlan });
      get().refresh();
      get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, patch: { wlan: d.config.wlan } });
    },

    setDhcpPool: (deviceId, start, end) => {
      get().sim.setDhcpPool(deviceId, start, end);
      get().refresh();
      get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, patch: { dhcpPool: get().sim.devices.find((x) => x.id === deviceId)?.dhcpPool ?? null } });
    },

    setDnsRecord: (deviceId, name, ip) => {
      const res = get().sim.addDnsRecord(deviceId, name, ip);
      if (!res.ok) toast({ title: "DNS record", description: res.error ?? "Failed.", variant: "error" });
      get().refresh();
      const d = get().sim.devices.find((x) => x.id === deviceId);
      if (d) get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, patch: { dnsRecords: d.dnsRecords } });
    },

    setServiceState: (deviceId, service, on) => {
      const res = get().sim.setServiceState(deviceId, service, on);
      if (!res.ok) toast({ title: "Service", description: res.error ?? "Failed.", variant: "error" });
      get().refresh();
      const d = get().sim.devices.find((x) => x.id === deviceId);
      if (d) get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, patch: { services: d.services } });
    },

    addRoute: (deviceId, network, mask, nextHop) => {
      const res = get().sim.addRoute(deviceId, network, mask, nextHop);
      if (!res.ok) toast({ title: "Route rejected", description: res.error ?? "Failed.", variant: "error" });
      get().refresh();
      const d = get().sim.devices.find((x) => x.id === deviceId);
      if (d) get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, patch: { routes: d.routes } });
    },

    removeRoute: (deviceId, routeId) => {
      get().sim.removeRoute(deviceId, routeId);
      get().refresh();
      const d = get().sim.devices.find((x) => x.id === deviceId);
      if (d) get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, patch: { routes: d.routes } });
    },

    runPing: (sourceId, target) => {
      const { sim } = get();
      const r = sim.ping(sourceId, target);
      const diag = sim.diagnose(sourceId, target);
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const { packets, bursts } = traceAnimations(sim.devices, sim.cables, r, now);
      const learn = !r.ok && !diag.ok ? pingFailureExplanation(diag) : null;
      set((s) => ({
        ...s,
        trace: r,
        diagnosis: null,
        packets: [...s.packets, ...packets],
        bursts: [...s.bursts, ...bursts],
        learn: learn ?? s.learn,
      }));
      if (r.ok) {
        toast({ title: "Reply received", description: r.summary, variant: "success" });
      } else {
        toast({ title: "Ping blocked", description: r.error ?? r.summary, variant: "error" });
      }
      const packetId = `pkt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      get().collabEmitter?.({ type: "PACKET_STARTED", packetId, sourceId, target, packetType: "icmp" });
      get().collabEmitter?.({ type: "PACKET_COMPLETED", packetId, sourceId, target, packetType: "icmp", ok: r.ok, summary: r.summary });
    },

    runPacket: (sourceId, target, type) => {
      const { sim } = get();
      const r = sim.runPacket({ sourceId, target, type });
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const { packets, bursts } = traceAnimations(sim.devices, sim.cables, r, now);
      set((s) => ({
        ...s,
        trace: r,
        diagnosis: null,
        packets: [...s.packets, ...packets],
        bursts: [...s.bursts, ...bursts],
      }));
      if (r.ok) toast({ title: "Packet delivered", description: r.summary, variant: "success" });
      const packetId = `pkt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      get().collabEmitter?.({ type: "PACKET_STARTED", packetId, sourceId, target, packetType: type });
      get().collabEmitter?.({ type: "PACKET_COMPLETED", packetId, sourceId, target, packetType: type, ok: r.ok, summary: r.summary });
    },

    runDiagnose: (sourceId, target) => {
      const d = get().sim.diagnose(sourceId, target);
      set((s) => ({
        ...s,
        diagnosis: d,
        learn: d.ok ? null : pingFailureExplanation(d),
      }));
    },

    tickAnimations: (now) =>
      set((s) => {
        const packets = s.packets.filter((p) => now - p.startedAt < p.duration);
        const bursts = s.bursts.filter((b) => now - b.startedAt < b.duration);
        if (packets.length === s.packets.length && bursts.length === s.bursts.length) return s;
        return { packets, bursts };
      }),

    openCmd: (deviceId) => {
      const { cmd, sim } = get();
      if (cmd?.deviceId === deviceId) return;
      const d = sim.devices.find((x) => x.id === deviceId);
      if (!d) return;
      const isIos = DEVICE_TYPES[d.type].cli;
      const host = d.config.hostname ?? "device";
      const base: CmdSessionLine[] = isIos
        ? [
            { text: "Cisco IOS XE, Network Lab Simulator (NSIM)", kind: "out" },
            { text: "", kind: "out" },
            { text: `Starting console session on ${host}. Type 'enable' to enter privileged mode.`, kind: "out" },
            { text: "", kind: "out" },
          ]
        : [
            { text: "Microsoft Windows [Version 10.0.22631]", kind: "out" },
            { text: "(c) Network Lab Simulator 2026", kind: "out" },
            { text: "", kind: "out" },
            { text: "Type HELP for a list of commands. Try PING 192.168.1.2 or IPCONFIG /ALL.", kind: "out" },
          ];
      set((s) => ({
        ...s,
        cmd: { deviceId, busy: false, history: [], lines: base },
        cliCtxs: isIos ? { ...s.cliCtxs, [deviceId]: s.cliCtxs[deviceId] ?? { mode: "user" } } : s.cliCtxs,
      }));
    },

    closeCmd: () => set((s) => ({ ...s, cmd: null })),

    clearCmd: () => set((s) => ({ ...s, cmd: s.cmd ? { ...s.cmd, lines: [] } : s.cmd })),

    clearCmdLog: () => set((s) => ({ ...s, cmdLog: [] })),

    runCmd: async (deviceId, raw) => {
      const { cmd, sim, cliCtxs } = get();
      if (!cmd || cmd.deviceId !== deviceId || cmd.busy) return;
      const trimmed = raw.trim();
      if (!trimmed) return;

      set((s) => ({
        ...s,
        cmd: {
          ...s.cmd!,
          busy: true,
          history: [...s.cmd!.history, trimmed],
          lines: [...s.cmd!.lines, { text: trimmed, kind: "in" }],
        },
      }));

      const lower = trimmed.toLowerCase();
      if (lower === "cls" || lower === "clear") {
        set((s) => ({ ...s, cmd: { ...s.cmd!, busy: false, lines: [] } }));
        return;
      }
      if (lower === "exit") {
        set((s) => ({ ...s, cmd: null }));
        return;
      }

      const result = runCommand(sim.netSnapshot(), deviceId, trimmed, cliCtxs[deviceId]);
      if (result.configSaved) sim.saveStartupConfig(deviceId);
      if (result.device) sim.applyDevice(result.device);

      set((s) => ({
        ...s,
        cliCtxs: result.ctx ? { ...s.cliCtxs, [deviceId]: result.ctx } : s.cliCtxs,
      }));

      const dev = sim.devices.find((d) => d.id === deviceId);
      const entry: CmdLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        device: dev?.config.hostname ?? deviceId,
        command: trimmed,
        result: result.ok ? "ok" : result.reason ?? "failed",
        reason: result.fault?.reason,
        ok: result.ok,
      };

      if (!result.ok && result.fault) {
        set((s) => ({
          ...s,
          learn: {
            title: result.fault!.reason,
            body: `${result.fault!.what} ${result.fault!.why} Try: ${result.fault!.fix}`,
            kind: "error",
          },
        }));
      }

      for (const ln of result.lines) {
        if (ln.delay && ln.delay > 0) await new Promise((r) => setTimeout(r, ln.delay));
        set((s) => ({
          ...s,
          cmd: s.cmd ? { ...s.cmd, lines: [...s.cmd.lines, { text: ln.text, kind: "out", status: ln.status }] } : s.cmd,
        }));
      }

      set((s) => ({
        ...s,
        cmd: s.cmd ? { ...s.cmd, busy: false } : s.cmd,
        cmdLog: [entry, ...s.cmdLog].slice(0, 50),
        version: s.version + 1,
        dirty: true,
      }));

      if (result.device) {
        const dev = get().sim.devices.find((d) => d.id === deviceId);
        if (dev) get().collabEmitter?.({ type: "DEVICE_UPDATED", deviceId, config: dev.config });
      }
      get().collabEmitter?.({
        type: "COMMAND_EXECUTED",
        deviceId,
        command: trimmed,
        ok: result.ok,
        summary: result.reason ?? (result.ok ? "ok" : "failed"),
      });
    },

    togglePower: (deviceId) => {
      const sim = get().sim;
      const d = sim.devices.find((x) => x.id === deviceId);
      if (!d) return;
      const off = d.poweredOn === false;
      sim.setPower(deviceId, off);
      set((s) => ({
        ...s,
        version: s.version + 1,
        dirty: true,
        contextMenu: null,
        trace: null,
        packets: [],
        bursts: [],
        learn: {
          title: `${d.config.hostname} ${off ? "powered on" : "powered off"}`,
          body: off
            ? "The device can send, receive and forward traffic again."
            : "A powered-off device cannot send, receive or forward — cables attached to it go down too.",
          kind: "info",
        },
      }));
      get().collabEmitter?.({ type: "DEVICE_POWER_CHANGED", deviceId, poweredOn: off });
    },

    setPan: (pan) => set((s) => ({ ...s, pan })),

    setZoom: (zoom) => set((s) => ({ ...s, zoom })),

    saveProject: async () => {
      const { sim, projectId, projectTitle } = get();
      const payload = { title: projectTitle || "My Network", snapshot: sim.snapshot };
      try {
        const res = await fetch(projectId ? `/api/networking/projects/${projectId}` : "/api/networking/projects", {
          method: projectId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = (await res.json()) as { data?: { id?: string; title?: string } };
        const row = raw.data ?? (raw as { id?: string; title?: string });
        set((s) => ({
          ...s,
          projectId: row.id ?? projectId,
          projectTitle: row.title ?? projectTitle,
          dirty: false,
        }));
        toast({ title: "Project saved", description: row.title ?? projectTitle, variant: "success" });
      } catch {
        toast({ title: "Save failed", description: "Could not reach the server.", variant: "error" });
      }
    },

    loadProject: async (id) => {
      try {
        const res = await fetch(`/api/networking/projects/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = (await res.json()) as { data?: { id?: string; title?: string; snapshot?: SimSnapshot } };
        const data = raw.data ?? (raw as { id?: string; title?: string; snapshot?: SimSnapshot });
        if (!data.snapshot) throw new Error("no snapshot");
        get().init(data.snapshot, { projectId: data.id ?? id, title: data.title ?? "My Network" });
        toast({ title: "Project opened", description: data.title, variant: "success" });
        get().collabEmitter?.({ type: "WORKSPACE_SYNC", snapshot: get().sim.snapshot });
      } catch {
        toast({ title: "Load failed", description: "Could not open that project.", variant: "error" });
      }
    },

    deleteProject: async (id) => {
      try {
        const res = await fetch(`/api/networking/projects/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (get().projectId === id) get().newCanvas();
        toast({ title: "Project deleted", variant: "info" });
      } catch {
        toast({ title: "Delete failed", variant: "error" });
      }
    },

    exportJson: () => {
      const blob = new Blob([get().sim.toJSON()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${get().projectTitle.replace(/\s+/g, "-").toLowerCase() || "network"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    importJson: (text) => {
      try {
        const data = JSON.parse(text) as SimSnapshot;
        get().init(data, { title: data.devices[0]?.config.name ?? "Imported Network" });
        toast({ title: "Import complete", variant: "success" });
        get().collabEmitter?.({ type: "WORKSPACE_SYNC", snapshot: get().sim.snapshot });
      } catch {
        toast({ title: "Import failed", description: "That file is not a valid network snapshot.", variant: "error" });
      }
    },

    applyRemoteEvent: (event) => {
      const g = get();
      const sim = g.sim;
      const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
      switch (event.type) {
        case "DEVICE_CREATED": {
          if (sim.devices.some((d) => d.id === event.device.id)) break;
          sim.devices.push(copy(event.device));
          sim.computeWireless();
          g.refresh();
          break;
        }
        case "DEVICE_MOVED": {
          const d = sim.devices.find((x) => x.id === event.deviceId);
          if (d) {
            d.x = event.x;
            d.y = event.y;
            g.refresh();
          }
          break;
        }
        case "DEVICE_DELETED": {
          if (!sim.devices.some((d) => d.id === event.deviceId)) break;
          sim.devices = sim.devices.filter((d) => d.id !== event.deviceId);
          sim.cables = sim.cables.filter((c) => c.fromDevice !== event.deviceId && c.toDevice !== event.deviceId);
          sim.computeWireless();
          set((s) => ({
            ...s,
            version: s.version + 1,
            selectedDeviceId: s.selectedDeviceId === event.deviceId ? null : s.selectedDeviceId,
            pingSourceId: s.pingSourceId === event.deviceId ? null : s.pingSourceId,
            configDeviceId: s.configDeviceId === event.deviceId ? null : s.configDeviceId,
          }));
          break;
        }
        case "DEVICE_UPDATED": {
          const d = sim.devices.find((x) => x.id === event.deviceId);
          if (!d) break;
          if (event.config) {
            d.config = copy(event.config);
            sim.computeWireless();
            g.refresh();
          } else if (event.patch) {
            const p = event.patch;
            if (p.hostname !== undefined) sim.updateDeviceConfig(event.deviceId, { hostname: p.hostname, name: p.hostname });
            if (p.dhcp !== undefined) sim.updateDeviceConfig(event.deviceId, { dhcp: p.dhcp });
            if (p.gateway !== undefined) sim.updateDeviceConfig(event.deviceId, { gateway: p.gateway });
            if (p.dns !== undefined) sim.updateDeviceConfig(event.deviceId, { dns: p.dns });
            if (p.wlan !== undefined) sim.updateDeviceConfig(event.deviceId, { wlan: p.wlan });
            if (p.rotation !== undefined) d.rotation = p.rotation;
            if (p.routes !== undefined) d.routes = copy(p.routes);
            if (p.dhcpPool !== undefined) d.dhcpPool = p.dhcpPool ? { ...p.dhcpPool } : null;
            if (p.dnsRecords !== undefined) d.dnsRecords = copy(p.dnsRecords);
            if (p.services !== undefined) d.services = copy(p.services);
            sim.computeWireless();
            g.refresh();
          }
          break;
        }
        case "INTERFACE_UPDATED": {
          const d = sim.devices.find((x) => x.id === event.deviceId);
          const iface = d?.config.interfaces.find((i) => i.id === event.portId);
          if (d && iface) {
            if (event.ip !== undefined) iface.ip = event.ip || undefined;
            if (event.mask !== undefined) iface.mask = event.mask || undefined;
            if (event.status !== undefined) iface.status = event.status;
            g.refresh();
          }
          break;
        }
        case "DEVICE_POWER_CHANGED": {
          sim.setPower(event.deviceId, event.poweredOn);
          g.refresh();
          break;
        }
        case "CABLE_CREATED": {
          if (sim.cables.some((c) => c.id === event.cableId)) break;
          const res = sim.connect(event.fromDevice, event.fromPort, event.toDevice, event.toPort, event.cableType);
          if (res.ok && res.cable) {
            res.cable.id = event.cableId;
            g.refresh();
          }
          break;
        }
        case "CABLE_REMOVED": {
          if (!sim.cables.some((c) => c.id === event.cableId)) break;
          sim.removeCable(event.cableId);
          g.refresh();
          break;
        }
        case "WORKSPACE_SYNC":
        case "TOPOLOGY_RESET": {
          sim.load(event.snapshot);
          g.refresh();
          break;
        }
        case "PACKET_STARTED": {
          const r = sim.ping(event.sourceId, event.target);
          if (r) {
            const now = typeof performance !== "undefined" ? performance.now() : Date.now();
            const { packets, bursts } = traceAnimations(sim.devices, sim.cables, r, now);
            set((s) => ({ ...s, packets: [...s.packets, ...packets], bursts: [...s.bursts, ...bursts] }));
          }
          break;
        }
        default:
          break;
      }
    },
  };
});
