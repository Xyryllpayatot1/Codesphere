import { DEVICE_TYPES } from "./devices";
import { CABLE_TYPES } from "./types";
import type { Cable, CableStatus, CableType, Device, DeviceType, PortKind } from "./types";

export type CableProblem = {
  ok: boolean;
  status: CableStatus;
  error?: string;
};

/**
 * Decide whether two devices may be connected with a given cable, and what
 * status that link gets. Educational checks — a straight-through cable between
 * a router and a router is rejected because that's exactly the kind of mistake
 * students make in Packet Tracer.
 */
export function evaluateCable(
  cableType: CableType,
  fromDevice: Device,
  toDevice: Device
): CableProblem {
  const fromDef = DEVICE_TYPES[fromDevice.type];
  const toDef = DEVICE_TYPES[toDevice.type];
  const cable = CABLE_TYPES[cableType];
  const fromKind = fromDevice.type;
  const toKind = toDevice.type;

  // 1. Media must be supported by both endpoints.
  if (!endpointSupports(fromKind, cable.portKind) || !endpointSupports(toKind, cable.portKind)) {
    return {
      ok: false,
      status: "error",
      error: `${cable.label} can't attach here. ${fromDef.label} and ${toDef.label} have no ${cable.portKind} ports.`,
    };
  }

  // 2. Console only to network devices (and only from an end device).
  if (cableType === "console") {
    const infraTarget = toDef.cli || toDef.kind === "infra" || toDef.kind === "router" || toDef.kind === "security";
    if (fromDef.kind !== "end") {
      return { ok: false, status: "error", error: "A console cable must start on a PC or laptop — the 'terminal'." };
    }
    if (!infraTarget) {
      return { ok: false, status: "error", error: "Console cables connect a PC to a router/switch/firewall, not to another end device." };
    }
  }

  // 3. Serial only between routers/firewalls (WAN links).
  if (cableType === "serial") {
    const bothRouters = (fromDef.kind === "router" || fromDef.kind === "security") && (toDef.kind === "router" || toDef.kind === "security");
    if (!bothRouters) {
      return { ok: false, status: "error", error: "Serial cables connect routers (WAN links). Other devices don't have serial ports." };
    }
  }

  // 4. Fiber between switches/routers (and the cloud edge).
  if (cableType === "fiber") {
    const allowed = (k: DeviceType) => k === "switch" || k === "router" || k === "firewall" || k === "server" || k === "cloud";
    if (!allowed(fromKind) || !allowed(toKind)) {
      return { ok: false, status: "error", error: "Fiber is for fast links between switches, routers, servers and the cloud edge." };
    }
  }

  // 5. Copper cable rule of thumb: straight-through links a DTE (PC, router,
  // server, firewall) to a DCE (switch, hub, AP); crossover links two DCEs or
  // two DTEs.
  if (cableType === "copperStraight" || cableType === "copperCrossover") {
    const isDte = (k: DeviceType) => k === "pc" || k === "laptop" || k === "server" || k === "printer" || k === "router" || k === "wirelessRouter" || k === "firewall" || k === "cloud";
    const dteToDce = isDte(fromKind) !== isDte(toKind);
    if (cableType === "copperStraight" && !dteToDce) {
      return {
        ok: false,
        status: "error",
        error: "Straight-through connects different device classes (PC/router to switch). Two similar devices need a crossover cable.",
      };
    }
    if (cableType === "copperCrossover" && dteToDce) {
      return {
        ok: false,
        status: "error",
        error: "Crossover connects similar devices (PC to PC, switch to switch, PC to router). Different classes need straight-through.",
      };
    }
  }

  return { ok: true, status: "up" };
}

function endpointSupports(type: string, kind: PortKind): boolean {
  const def = DEVICE_TYPES[type as keyof typeof DEVICE_TYPES];
  return def.ports.includes(kind);
}

export function cableStatus(c: Cable, devices: Device[]): CableStatus {
  const from = devices.find((d) => d.id === c.fromDevice);
  const to = devices.find((d) => d.id === c.toDevice);
  if (!from || !to) return "error";
  if (from.poweredOn === false || to.poweredOn === false) return "down";
  const fromPort = from.config.interfaces.find((i) => i.id === c.fromPort);
  const toPort = to.config.interfaces.find((i) => i.id === c.toPort);
  if (fromPort && fromPort.status === "down") return "down";
  if (toPort && toPort.status === "down") return "down";
  return "up";
}
