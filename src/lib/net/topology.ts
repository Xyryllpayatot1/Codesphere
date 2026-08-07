// ---------------------------------------------------------------------------
// Topology library — ready-made reference networks for lessons and the
// "Topologies" panel. Each builder returns a full SimSnapshot (like the four
// mission templates) so students can load, inspect and experiment on them.
// ---------------------------------------------------------------------------

import { NetworkSimulator } from "./sim";
import type { SimSnapshot } from "./types";

export type TopologyDef = {
  id: string;
  title: string;
  short: string;
  description: string;
  lesson: string;
  devices: string[];
};

const topo = (name: string, def: Omit<TopologyDef, "id">): TopologyDef => ({ id: name, ...def });

export const TOPOLOGIES: TopologyDef[] = [
  topo("star", {
    title: "Star",
    short: "Every device connects to one switch",
    description: "A single switch in the middle and every PC on its own cable. One broken cable only affects that device.",
    lesson: "Most real LANs are stars. Switches isolate traffic per port and learn MAC addresses.",
    devices: ["switch", "4× PC"],
  }),
  topo("bus", {
    title: "Bus",
    short: "One shared cable / hub",
    description: "A hub replays every frame to every port — all devices share the medium, so only one may talk at a time.",
    lesson: "Hubs (and old coaxial buses) are shared media: collisions happen, performance drops as hosts are added.",
    devices: ["hub", "4× PC"],
  }),
  topo("ring", {
    title: "Ring",
    short: "Switches daisy-chained in a loop",
    description: "Switches connected in a circle. A break in any link can still leave the ring reachable from the other side.",
    lesson: "Ring links give redundancy, but without Spanning Tree the loop would cause broadcast storms.",
    devices: ["4× switch", "4× PC"],
  }),
  topo("mesh", {
    title: "Mesh",
    short: "Routers fully connected",
    description: "Every router links to every other router over serial WAN lines. No single router failure isolates the network.",
    lesson: "Full mesh provides maximum redundancy but the most cabling — that is why real WANs often use partial mesh.",
    devices: ["3× router", "3× switch", "3× PC"],
  }),
  topo("tree", {
    title: "Tree",
    short: "A hierarchy of switches",
    description: "A root switch feeds two department switches, each serving its own PCs. Scales without every port reaching the root.",
    lesson: "Tree/hierarchical designs scale: aggregation switches summarize whole groups of devices.",
    devices: ["3× switch", "4× PC"],
  }),
  topo("hybrid", {
    title: "Hybrid",
    short: "Routed LAN + wireless + WAN",
    description: "A router joins two wired LANs, one with Wi-Fi via an access point, and a serial link out to another router.",
    lesson: "Real networks mix switching, routing, wireless and WAN links — the different layers work together.",
    devices: ["2× router", "2× switch", "access point", "laptop", "2× PC"],
  }),
];

function label(sim: NetworkSimulator, dev: ReturnType<NetworkSimulator["addDevice"]>, name: string) {
  dev.config.hostname = name;
}

/** Star: one switch, four PCs. */
function buildStar(): SimSnapshot {
  const sim = new NetworkSimulator();
  sim.name = "star";
  const sw = sim.addDevice("switch", 440, 220);
  label(sim, sw, "SW1");
  const hosts: { d: ReturnType<NetworkSimulator["addDevice"]>; name: string; ip: string }[] = [
    { d: sim.addDevice("pc", 200, 80), name: "PC1", ip: "192.168.1.10" },
    { d: sim.addDevice("pc", 700, 80), name: "PC2", ip: "192.168.1.11" },
    { d: sim.addDevice("pc", 160, 380), name: "PC3", ip: "192.168.1.12" },
    { d: sim.addDevice("pc", 740, 380), name: "PC4", ip: "192.168.1.13" },
  ];
  hosts.forEach((h, i) => {
    label(sim, h.d, h.name);
    h.d.config.interfaces[0] = { ...h.d.config.interfaces[0], ip: h.ip, mask: "255.255.255.0" };
    sim.connect(h.d.id, "eth0", sw.id, `eth${i}`, "copperStraight");
  });
  return sim.snapshot;
}

/** Bus: one hub, four PCs (shared medium). */
function buildBus(): SimSnapshot {
  const sim = new NetworkSimulator();
  sim.name = "bus";
  const hub = sim.addDevice("hub", 440, 220);
  label(sim, hub, "Hub1");
  const hosts: { d: ReturnType<NetworkSimulator["addDevice"]>; name: string; ip: string }[] = [
    { d: sim.addDevice("pc", 160, 80), name: "PC1", ip: "192.168.1.10" },
    { d: sim.addDevice("pc", 760, 80), name: "PC2", ip: "192.168.1.11" },
    { d: sim.addDevice("pc", 140, 380), name: "PC3", ip: "192.168.1.12" },
    { d: sim.addDevice("pc", 780, 380), name: "PC4", ip: "192.168.1.13" },
  ];
  hosts.forEach((h, i) => {
    label(sim, h.d, h.name);
    h.d.config.interfaces[0] = { ...h.d.config.interfaces[0], ip: h.ip, mask: "255.255.255.0" };
    sim.connect(h.d.id, "eth0", hub.id, `eth${i}`, "copperStraight");
  });
  return sim.snapshot;
}

/** Ring: four switches in a loop, one PC per switch. */
function buildRing(): SimSnapshot {
  const sim = new NetworkSimulator();
  sim.name = "ring";
  const switches: ReturnType<NetworkSimulator["addDevice"]>[] = [];
  const xs = [120, 760, 760, 120];
  const ys = [120, 120, 420, 420];
  for (let i = 0; i < 4; i++) {
    const sw = sim.addDevice("switch", xs[i], ys[i]);
    label(sim, sw, `SW${i + 1}`);
    switches.push(sw);
    const pc = sim.addDevice("pc", xs[i] + (i % 2 === 0 ? -140 : 140), ys[i] + 90);
    label(sim, pc, `PC${i + 1}`);
    pc.config.interfaces[0] = { ...pc.config.interfaces[0], ip: `192.168.1.1${i}`, mask: "255.255.255.0" };
    sim.connect(pc.id, "eth0", sw.id, "eth0", "copperStraight");
  }
  for (let i = 0; i < 4; i++) {
    sim.connect(switches[i].id, `eth${i + 1}`, switches[(i + 1) % 4].id, `eth${((i + 1) % 4) + 1}`, "copperCrossover");
  }
  return sim.snapshot;
}

/** Mesh: three routers fully meshed over serial, one PC per site. */
function buildMesh(): SimSnapshot {
  const sim = new NetworkSimulator();
  sim.name = "mesh";
  const pos = [
    { x: 240, y: 120 },
    { x: 760, y: 120 },
    { x: 500, y: 420 },
  ];
  const rs: ReturnType<NetworkSimulator["addDevice"]>[] = [];
  pos.forEach((p, i) => {
    const r = sim.addDevice("router", p.x, p.y);
    label(sim, r, `R${i + 1}`);
    r.config.interfaces[0] = { ...r.config.interfaces[0], ip: `192.168.${i + 1}.1`, mask: "255.255.255.0" };
    const sw = sim.addDevice("switch", p.x, p.y + 140);
    label(sim, sw, `SW${i + 1}`);
    const pc = sim.addDevice("pc", p.x + 130, p.y + 140);
    label(sim, pc, `PC${i + 1}`);
    pc.config.interfaces[0] = { ...pc.config.interfaces[0], ip: `192.168.${i + 1}.10`, mask: "255.255.255.0", status: "up" };
    pc.config.gateway = `192.168.${i + 1}.1`;
    sim.connect(pc.id, "eth0", sw.id, "eth0", "copperStraight");
    sim.connect(sw.id, "eth1", r.id, "eth0", "copperStraight");
    rs.push(r);
  });
  const wan = [
    [0, 1, "10.0.0.1", "10.0.0.2"],
    [0, 2, "10.0.1.1", "10.0.1.2"],
    [1, 2, "10.0.2.1", "10.0.2.2"],
  ];
  wan.forEach(([a, b, ipa, ipb], i) => {
    const ra = rs[a as number];
    const rb = rs[b as number];
    const porta = i === 0 ? "serial0" : i === 1 ? "serial1" : "serial0";
    const portb = i === 0 ? "serial0" : i === 1 ? "serial0" : "serial1";
    ra.config.interfaces.find((x) => x.id === porta)!.ip = ipa as string;
    ra.config.interfaces.find((x) => x.id === porta)!.mask = "255.255.255.252";
    rb.config.interfaces.find((x) => x.id === portb)!.ip = ipb as string;
    rb.config.interfaces.find((x) => x.id === portb)!.mask = "255.255.255.252";
    sim.connect(ra.id, porta, rb.id, portb, "serial");
  });
  return sim.snapshot;
}

/** Tree: root switch → two department switches → four PCs. */
function buildTree(): SimSnapshot {
  const sim = new NetworkSimulator();
  sim.name = "tree";
  const root = sim.addDevice("switch", 440, 120);
  label(sim, root, "SW1");
  const leaves = [sim.addDevice("switch", 180, 320), sim.addDevice("switch", 700, 320)];
  label(sim, leaves[0], "SW2");
  label(sim, leaves[1], "SW3");
  leaves.forEach((sw, i) => sim.connect(root.id, `eth${i}`, sw.id, "eth0", "copperCrossover"));
  for (let l = 0; l < 2; l++) {
    for (let p = 0; p < 2; p++) {
      const pc = sim.addDevice("pc", 60 + l * 440 + p * 140, 460);
      label(sim, pc, `PC${l * 2 + p + 1}`);
      pc.config.interfaces[0] = { ...pc.config.interfaces[0], ip: `192.168.1.1${l * 2 + p}`, mask: "255.255.255.0" };
      sim.connect(pc.id, "eth0", leaves[l].id, `eth${p + 1}`, "copperStraight");
    }
  }
  return sim.snapshot;
}

/** Hybrid: routed LAN A + LAN B (with Wi-Fi) + serial WAN. */
function buildHybrid(): SimSnapshot {
  const sim = new NetworkSimulator();
  sim.name = "hybrid";
  const r1 = sim.addDevice("router", 300, 200);
  label(sim, r1, "R1");
  const r2 = sim.addDevice("router", 860, 120);
  label(sim, r2, "R2");
  const sw1 = sim.addDevice("switch", 120, 320);
  label(sim, sw1, "SW1");
  const sw2 = sim.addDevice("switch", 560, 420);
  label(sim, sw2, "SW2");
  const ap = sim.addDevice("accessPoint", 480, 300);
  label(sim, ap, "AP1");
  ap.config.wlan = { ssid: "HybridNet", enabled: true };

  r1.config.interfaces[0] = { ...r1.config.interfaces[0], ip: "192.168.1.1", mask: "255.255.255.0" };
  r1.config.interfaces[1] = { ...r1.config.interfaces[1], ip: "192.168.2.1", mask: "255.255.255.0" };
  r1.config.interfaces.find((i) => i.id === "serial0")!.ip = "10.0.0.1";
  r1.config.interfaces.find((i) => i.id === "serial0")!.mask = "255.255.255.252";
  r2.config.interfaces.find((i) => i.id === "serial0")!.ip = "10.0.0.2";
  r2.config.interfaces.find((i) => i.id === "serial0")!.mask = "255.255.255.252";
  r2.config.interfaces[0] = { ...r2.config.interfaces[0], ip: "192.168.9.1", mask: "255.255.255.0" };
  r1.routes.push({ id: "r1-def", network: "0.0.0.0", mask: "0.0.0.0", nextHop: "10.0.0.2" });
  r2.routes.push({ id: "r2-lans", network: "192.168.1.0", mask: "255.255.255.0", nextHop: "10.0.0.1" });
  r2.routes.push({ id: "r2-lan2", network: "192.168.2.0", mask: "255.255.255.0", nextHop: "10.0.0.1" });

  const pc1 = sim.addDevice("pc", 60, 140);
  label(sim, pc1, "PC1");
  pc1.config.interfaces[0] = { ...pc1.config.interfaces[0], ip: "192.168.1.10", mask: "255.255.255.0", status: "up" };
  pc1.config.gateway = "192.168.1.1";
  const server = sim.addDevice("server", 60, 480);
  label(sim, server, "SRV1");
  server.config.interfaces[0] = { ...server.config.interfaces[0], ip: "192.168.1.20", mask: "255.255.255.0", status: "up" };
  const laptop = sim.addDevice("laptop", 720, 300);
  label(sim, laptop, "Laptop1");
  laptop.config.wlan = { ssid: "HybridNet", enabled: true };
  laptop.config.interfaces[0] = { ...laptop.config.interfaces[0], ip: "192.168.2.20", mask: "255.255.255.0", status: "up" };
  laptop.config.gateway = "192.168.2.1";
  const pc2 = sim.addDevice("pc", 720, 520);
  label(sim, pc2, "PC2");
  pc2.config.interfaces[0] = { ...pc2.config.interfaces[0], ip: "192.168.2.10", mask: "255.255.255.0", status: "up" };
  pc2.config.gateway = "192.168.2.1";

  sim.connect(pc1.id, "eth0", sw1.id, "eth0", "copperStraight");
  sim.connect(server.id, "eth0", sw1.id, "eth1", "copperStraight");
  sim.connect(sw1.id, "eth2", r1.id, "eth0", "copperStraight");
  sim.connect(r1.id, "eth1", sw2.id, "eth0", "copperStraight");
  sim.connect(ap.id, "eth0", sw2.id, "eth1", "copperCrossover");
  sim.connect(pc2.id, "eth0", sw2.id, "eth2", "copperStraight");
  sim.connect(r1.id, "serial0", r2.id, "serial0", "serial");
  const cloud = sim.addDevice("cloud", 1000, 260);
  label(sim, cloud, "Internet");
  sim.connect(cloud.id, "eth0", r2.id, "eth1", "fiber");
  return sim.snapshot;
}

export type TopologyKey = "star" | "bus" | "ring" | "mesh" | "tree" | "hybrid";

const BUILDERS: Record<TopologyKey, () => SimSnapshot> = {
  star: buildStar,
  bus: buildBus,
  ring: buildRing,
  mesh: buildMesh,
  tree: buildTree,
  hybrid: buildHybrid,
};

export function buildTopology(name: TopologyKey): SimSnapshot {
  return BUILDERS[name]();
}
