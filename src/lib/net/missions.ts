// ---------------------------------------------------------------------------
// Networking missions — the scaffolding for the /networking activities.
//
// Each mission ships a starting state (one of the four templates, or empty)
// and a pure `verify(sim)` check that only inspects a NetworkSimulator. The
// exact same function runs in the browser (live mission panel) and server-side
// (submit route, on the snapshot the client sends), so rewards are only
// granted when the network really works.
// ---------------------------------------------------------------------------

import { NetworkSimulator, buildTemplate, type TemplateName } from "./sim";
import { portVlan, vlanActive } from "./packets";
import type { SimSnapshot } from "./types";

export type MissionDifficulty = "beginner" | "intermediate" | "advanced";

export type MissionVerify = (sim: NetworkSimulator) => { ok: boolean; message: string; hints: string[] };

export type NetMission = {
  slug: string;
  order: number;
  title: string;
  short: string;
  difficulty: MissionDifficulty;
  xp: number;
  coins: number;
  template: "empty" | TemplateName;
  objectives: string[];
  verify: MissionVerify;
};

// ------------------------------------------------------------- helpers

function byName(sim: NetworkSimulator, name: string) {
  return sim.devices.find((d) => d.config.hostname === name || d.config.name === name);
}

function firstIp(d: { config: { interfaces: { ip?: string }[] } }): string | null {
  return d.config.interfaces.find((i) => i.ip)?.ip ?? null;
}

function dhcpIps(sim: NetworkSimulator): string[] {
  return sim.devices
    .flatMap((d) => d.config.interfaces)
    .filter((i) => i.ip && /^192\.168\.1\./.test(i.ip))
    .map((i) => i.ip!);
}

/** Runs the diagnosis engine and turns it into mission hints. */
function pingWithHints(sim: NetworkSimulator, from: ReturnType<typeof byName>, targetIp: string): { ok: boolean; message: string; hints: string[] } {
  if (!from) return { ok: false, message: "The source device is missing.", hints: ["Add the device the mission expects (hostname shown in the objective)."] };
  const result = sim.ping(from.id, targetIp);
  if (result.ok) return { ok: true, message: result.summary, hints: [] };
  const diag = sim.diagnose(from.id, targetIp);
  return {
    ok: false,
    message: diag.message,
    hints: [diag.hint, `Trace: ${result.error ?? "packet stopped before the destination."}`],
  };
}

// ------------------------------------------------------------- missions

export const NET_MISSIONS: NetMission[] = [
  {
    slug: "lan-basics",
    order: 1,
    title: "Connect a LAN",
    short: "Switch, cables, IPs — then ping.",
    difficulty: "beginner",
    xp: 15,
    coins: 5,
    template: "empty",
    objectives: [
      "Add a switch and two PCs to the canvas.",
      "Cable both PCs to the switch with straight-through cables.",
      "Give each PC an IP address on the same network (e.g. 192.168.1.x / 255.255.255.0).",
      "Send a ping from one PC to the other — it must get a reply.",
    ],
    verify: (sim) => {
      const pcs = sim.devices.filter((d) => d.type === "pc");
      if (pcs.length < 2) {
        return { ok: false, message: "You need at least two PCs.", hints: ["Drag a PC from the palette, then add a second one.", "Add a switch too — PCs talk to each other through it."] };
      }
      const switchCount = sim.devices.filter((d) => d.type === "switch").length;
      if (switchCount < 1) return { ok: false, message: "No switch on the canvas.", hints: ["Add a switch and cable every PC to it with a straight-through cable."] };

      const targets: { d: ReturnType<typeof byName>; name: string }[] = [
        { d: byName(sim, "PC1"), name: "PC1" },
        { d: byName(sim, "PC2"), name: "PC2" },
      ];
      if (!targets[0].d) {
        const [a, b] = pcs;
        if (!a || !b) return { ok: false, message: "Two PCs are needed.", hints: [] };
        return checkPair(sim, a, b);
      }
      if (!targets[1].d) return { ok: false, message: "PC2 is missing.", hints: [] };
      return checkPair(sim, targets[0].d, targets[1].d);
    },
  },
  {
    slug: "dhcp-automation",
    order: 2,
    title: "DHCP: IPs for free",
    short: "Let a server hand out addresses.",
    difficulty: "beginner",
    xp: 20,
    coins: 6,
    template: "small-lan",
    objectives: [
      "Give the server (SRV1) the static IP 192.168.1.10 / 255.255.255.0.",
      "Configure a DHCP pool on the server (e.g. 192.168.1.50 – 192.168.1.100).",
      "Switch both PCs to DHCP and obtain addresses from the server.",
      "PC1 must be able to ping PC2 with its auto-assigned IP.",
    ],
    verify: (sim) => {
      const srv = sim.devices.find((d) => d.type === "server");
      if (!srv || !srv.dhcpPool) {
        return { ok: false, message: "No DHCP server with a pool on this network.", hints: ["Add a server, give it an IP, then set a DHCP pool range in its config panel."] };
      }
      const dhcpClients = sim.devices.filter((d) => (d.type === "pc" || d.type === "laptop") && d.config.interfaces.some((i) => i.ip));
      const fromServer = dhcpIps(sim);
      if (dhcpClients.length < 2 || fromServer.length < 2) {
        return { ok: false, message: "Both PCs still need addresses from the DHCP server.", hints: ["Open each PC and set IP mode to DHCP, then press 'Renew'."] };
      }
      const [a, b] = sim.devices.filter((d) => d.type === "pc" && d.config.interfaces.some((i) => i.ip));
      if (!a || !b) return { ok: false, message: "Both PCs need addresses.", hints: [] };
      return checkPair(sim, a, b);
    },
  },
  {
    slug: "routing-across-networks",
    order: 3,
    title: "Route between two networks",
    short: "Two routers, two LANs, static routes.",
    difficulty: "intermediate",
    xp: 30,
    coins: 8,
    template: "two-router",
    objectives: [
      "Configure R1 (192.168.1.1) and R2 (192.168.2.1) on their LAN interfaces.",
      "Give PC1 IP 192.168.1.10 / gateway 192.168.1.1 and PC2 192.168.2.10 / gateway 192.168.2.1.",
      "Add a static route on R1 to 192.168.2.0 via 10.0.0.2.",
      "Add a static route on R2 to 192.168.1.0 via 10.0.0.1.",
      "PC1 must ping PC2 (192.168.2.10) successfully.",
    ],
    verify: (sim) => {
      const pc1 = byName(sim, "PC1");
      const pc2 = byName(sim, "PC2");
      if (!pc1 || !pc2) return { ok: false, message: "Both PCs are required (PC1, PC2).", hints: ["Rename devices if you added new ones, or restore the template."] };
      const targetIp = firstIp(pc2);
      if (!targetIp) return { ok: false, message: "PC2 has no IP address yet.", hints: ["Set PC2 to 192.168.2.10 / 255.255.255.0 with gateway 192.168.2.1."] };
      return pingWithHints(sim, pc1, targetIp);
    },
  },
  {
    slug: "home-wifi",
    order: 4,
    title: "Wireless home network",
    short: "Wi-Fi association, same subnet.",
    difficulty: "intermediate",
    xp: 25,
    coins: 7,
    template: "wifi",
    objectives: [
      "The laptop must join the access point's Wi-Fi (same SSID).",
      "Configure the laptop with 192.168.1.20 / gateway 192.168.1.1.",
      "Configure PC1 with 192.168.1.2 / gateway 192.168.1.1.",
      "PC1 must ping the laptop's IP address.",
    ],
    verify: (sim) => {
      const laptop = sim.devices.find((d) => d.type === "laptop");
      if (!laptop || !laptop.config.wlan?.enabled) {
        return { ok: false, message: "No laptop joined the Wi-Fi network.", hints: ["Add a laptop and enable Wi-Fi with the same SSID as the access point."] };
      }
      const laptopIp = firstIp(laptop);
      if (!laptopIp) return { ok: false, message: "The laptop has no IP address.", hints: ["Set the laptop to 192.168.1.20 / 255.255.255.0 with gateway 192.168.1.1."] };
      const pc = sim.devices.find((d) => d.type === "pc");
      if (!pc) return { ok: false, message: "PC1 is missing.", hints: ["Add PC1 with 192.168.1.2 / 255.255.255.0 and gateway 192.168.1.1."] };
      return pingWithHints(sim, pc, laptopIp);
    },
  },
  {
    slug: "internet-connection",
    order: 5,
    title: "Connect to the internet",
    short: "Default routes through a firewall.",
    difficulty: "advanced",
    xp: 35,
    coins: 10,
    template: "internet",
    objectives: [
      "Give the cloud (Internet) the IP 203.0.113.2 / 255.255.255.0.",
      "Add a default route on the firewall FW1 pointing out to R1 (10.0.0.1).",
      "Add a route on R1 back to the LAN: 192.168.1.0 via 10.0.0.2.",
      "PC1 must ping the cloud's IP (203.0.113.2).",
    ],
    verify: (sim) => {
      const cloud = sim.devices.find((d) => d.type === "cloud");
      const cloudIp = cloud ? firstIp(cloud) : null;
      if (!cloud || !cloudIp) {
        return { ok: false, message: "The cloud (Internet) has no IP address.", hints: ["Select the cloud and set 203.0.113.2 / 255.255.255.0 on its interface."] };
      }
      const pc = sim.devices.find((d) => d.type === "pc");
      if (!pc) return { ok: false, message: "PC1 is missing.", hints: ["Add PC1 with 192.168.1.10 and gateway 192.168.1.1."] };
      return pingWithHints(sim, pc, cloudIp);
    },
  },
  {
    slug: "vlan-isolation",
    order: 6,
    title: "Isolate traffic with VLANs",
    short: "Put two PCs on their own VLAN.",
    difficulty: "intermediate",
    xp: 30,
    coins: 8,
    template: "small-lan",
    objectives: [
      "Create VLAN 10 on the switch (SW1) with the console: `vlan 10`.",
      "Put the switch ports facing PC1 and PC2 into access VLAN 10.",
      "Give PC1 and PC2 IP addresses on the same subnet (e.g. 192.168.1.x / 255.255.255.0).",
      "PC1 must ping PC2 — both hosts are now isolated in their own broadcast domain.",
    ],
    verify: (sim) => {
      const sw = sim.devices.find((d) => d.type === "switch");
      if (!sw) return { ok: false, message: "No switch found.", hints: ["The template ships with SW1 — keep it."] };
      if (!vlanActive(sw) || !sw.vlans?.some((v) => v.id === 10)) {
        return { ok: false, message: "VLAN 10 is not configured on the switch.", hints: ["Open SW1's console: type 'enable', then 'configure terminal', then 'vlan 10'.", "Check with 'show vlan brief'."] };
      }
      const pcs = sim.devices.filter((d) => d.type === "pc");
      if (pcs.length < 2) return { ok: false, message: "Both PC1 and PC2 are required.", hints: ["Add PC1 and PC2 and cable each to the switch."] };
      const inVlan10 = pcs.filter((pc) => {
        const cable = sim.cables.find((c) => (c.fromDevice === pc.id && c.toDevice === sw.id) || (c.fromDevice === sw.id && c.toDevice === pc.id));
        if (!cable) return false;
        const portId = cable.fromDevice === sw.id ? cable.fromPort : cable.toPort;
        return portVlan(sw, portId) === 10;
      });
      if (inVlan10.length < 2) {
        return { ok: false, message: "Both PC-facing switch ports must be in access VLAN 10.", hints: ["On each port facing a PC run: 'interface <port>' then 'switchport access vlan 10'.", "Verify with 'show vlan brief'."] };
      }
      const [a, b] = pcs;
      if (!a || !b) return { ok: false, message: "Both PCs need an IP address.", hints: ["Give PC1 and PC2 IPs like 192.168.1.10 / 192.168.1.11 with mask 255.255.255.0."] };
      return checkPair(sim, a, b);
    },
  },
  {
    slug: "nos-switch-mgmt",
    order: 7,
    title: "Bring up a switch for management",
    short: "IP + no shutdown on a management port.",
    difficulty: "intermediate",
    xp: 30,
    coins: 8,
    template: "nos-basic",
    objectives: [
      "Open SW1's console and enter privileged exec (enable), then global configuration (configure terminal).",
      "Enter interface FastEthernet0/0, give it the IP 192.168.1.1 / 255.255.255.0, and bring it up with 'no shutdown'.",
      "Configure PC1 with 192.168.1.10 / 255.255.255.0 and gateway 192.168.1.1.",
      "PC1 must ping the switch's management IP (192.168.1.1).",
    ],
    verify: (sim) => {
      const sw = byName(sim, "SW1");
      if (!sw) return { ok: false, message: "SW1 is missing from the template.", hints: ["Restore the template — the lab ships with a switch named SW1."] };
      const mgmt = sw.config.interfaces.find((i) => i.ip === "192.168.1.1");
      if (!mgmt) {
        return { ok: false, message: "No switch interface has the management IP 192.168.1.1 yet.", hints: ["Enter interface FastEthernet0/0 and run: ip address 192.168.1.1 255.255.255.0"] };
      }
      if (mgmt.status !== "up") {
        return { ok: false, message: "The management interface is configured but still administratively down.", hints: ["On interface FastEthernet0/0 run: no shutdown", "A port in 'shutdown' cannot answer ARP or pings."] };
      }
      const pc1 = byName(sim, "PC1");
      if (!pc1 || firstIp(pc1) !== "192.168.1.10") {
        return { ok: false, message: "PC1 is not using 192.168.1.10.", hints: ["Set PC1 to 192.168.1.10 / 255.255.255.0 with gateway 192.168.1.1."] };
      }
      if (pc1!.config.gateway !== "192.168.1.1") {
        return { ok: false, message: "PC1's gateway is not set to 192.168.1.1.", hints: ["PC1 is on the same subnet, so the gateway is the switch itself: 192.168.1.1."] };
      }
      return pingWithHints(sim, pc1, "192.168.1.1");
    },
  },
  {
    slug: "nos-interface-faults",
    order: 8,
    title: "Fix interface faults",
    short: "No shutdown, wrong subnet, no IP.",
    difficulty: "advanced",
    xp: 40,
    coins: 10,
    template: "nos-faults",
    objectives: [
      "Compare each host against MgmtPC (the healthy one) and identify what is wrong.",
      "Bring up SW1's management interface and set it to 192.168.1.1 / 255.255.255.0.",
      "Fix PC1: it must be 192.168.1.10 / 255.255.255.0 with gateway 192.168.1.1.",
      "Give PC2 the address 192.168.1.11 / 255.255.255.0 with gateway 192.168.1.1.",
      "PC1 must ping the switch (192.168.1.1) and PC2 (192.168.1.11).",
    ],
    verify: (sim) => {
      const sw = byName(sim, "SW1");
      const mgmtIface = sw?.config.interfaces.find((i) => i.ip === "192.168.1.1");
      if (!sw || !mgmtIface || mgmtIface.status !== "up") {
        return { ok: false, message: "SW1's management interface is not up with 192.168.1.1 / 255.255.255.0.", hints: ["Enter interface FastEthernet0/0: ip address 192.168.1.1 255.255.255.0, then no shutdown."] };
      }
      const pc1 = byName(sim, "PC1");
      if (!pc1) return { ok: false, message: "PC1 is missing.", hints: ["Keep the template's PC1."] };
      const pc1Iface = pc1.config.interfaces[0];
      if (pc1Iface.ip !== "192.168.1.10" || pc1Iface.mask !== "255.255.255.0") {
        return { ok: false, message: `PC1 is still on the wrong address (${pc1Iface.ip ?? "none"} / ${pc1Iface.mask ?? "none"}).`, hints: ["PC1 is faulted with a wrong subnet — set 192.168.1.10 / 255.255.255.0.", "Two hosts only share a network when their IPs AND masks agree."] };
      }
      const pc2 = byName(sim, "PC2");
      if (!pc2) return { ok: false, message: "PC2 is missing.", hints: ["Keep the template's PC2."] };
      const pc2Iface = pc2.config.interfaces[0];
      if (!pc2Iface.ip) {
        return { ok: false, message: "PC2 still has no IP address.", hints: ["PC2 is faulted with no address — set 192.168.1.11 / 255.255.255.0."] };
      }
      if (pc2Iface.ip !== "192.168.1.11") {
        return { ok: false, message: `PC2 is using ${pc2Iface.ip}.`, hints: ["Use 192.168.1.11 / 255.255.255.0 so it shares PC1's subnet."] };
      }
      const toSwitch = pingWithHints(sim, pc1, "192.168.1.1");
      if (!toSwitch.ok) return toSwitch;
      return pingWithHints(sim, pc1, "192.168.1.11");
    },
  },
  {
    slug: "nos-route-fault",
    order: 9,
    title: "Troubleshoot a routed network",
    short: "Down interface + missing routes.",
    difficulty: "advanced",
    xp: 40,
    coins: 10,
    template: "nos-faults-routed",
    objectives: [
      "Check both routers with 'show ip interface brief' and find the interface that is down.",
      "Bring up R2's LAN interface (Gi0/0) with 'no shutdown'.",
      "Add the missing route on R1: 192.168.2.0 / 255.255.255.0 via 10.0.0.2.",
      "Add the missing route on R2: 192.168.1.0 / 255.255.255.0 via 10.0.0.1.",
      "PC1 must ping PC2 (192.168.2.10).",
    ],
    verify: (sim) => {
      const r2 = byName(sim, "R2");
      if (!r2) return { ok: false, message: "R2 is missing.", hints: ["Restore the template — it ships with routers R1 and R2."] };
      const r2Lan = r2.config.interfaces[0];
      if (r2Lan.status !== "up") {
        return { ok: false, message: "R2's LAN interface (Gi0/0) is administratively down.", hints: ["On R2: interface Gi0/0, then no shutdown.", "Traffic for Site B dies at R2's LAN port — check 'show ip interface brief'."] };
      }
      const r1 = byName(sim, "R1");
      if (!r1) return { ok: false, message: "R1 is missing.", hints: ["Restore the template — it ships with routers R1 and R2."] };
      if (!r1.routes.some((rt) => rt.network === "192.168.2.0" && rt.mask === "255.255.255.0" && rt.nextHop === "10.0.0.2")) {
        return { ok: false, message: "R1 has no route to Site B (192.168.2.0/24).", hints: ["On R1: ip route 192.168.2.0 255.255.255.0 10.0.0.2", "Verify with 'show ip route'."] };
      }
      if (!r2.routes.some((rt) => rt.network === "192.168.1.0" && rt.mask === "255.255.255.0" && rt.nextHop === "10.0.0.1")) {
        return { ok: false, message: "R2 has no route back to Site A (192.168.1.0/24).", hints: ["On R2: ip route 192.168.1.0 255.255.255.0 10.0.0.1", "Replies to PC1 fail without the return route."] };
      }
      const pc1 = byName(sim, "PC1");
      if (!pc1) return { ok: false, message: "PC1 is missing.", hints: ["Keep the template's PC1."] };
      return pingWithHints(sim, pc1, "192.168.2.10");
    },
  },
  {
    slug: "nos-capstone",
    order: 10,
    title: "Design a small enterprise network",
    short: "VLANs, routing, faults — everything.",
    difficulty: "advanced",
    xp: 80,
    coins: 20,
    template: "nos-capstone",
    objectives: [
      "On SW-A, create VLAN 10 (staff) and VLAN 20 (guests): 'vlan 10' then 'vlan 20'.",
      "Set SW-A ports: PC1 and MgmtPC → access VLAN 10; PC2 → access VLAN 20; the port facing R1 → access VLAN 10.",
      "Bring up R2's LAN interface (Gi0/0) with 'no shutdown'.",
      "Route both sites: R1 → 192.168.2.0 / 255.255.255.0 via 10.0.0.2; R2 → 192.168.1.0 / 255.255.255.0 via 10.0.0.1.",
      "Fix PC4's addressing: 192.168.2.11 / 255.255.255.0 with gateway 192.168.2.1.",
      "PC1 must ping PC3 (192.168.2.10) — and PC2 (VLAN 20) must stay isolated from the rest.",
      "Save the running configuration on R1 and R2 ('write memory').",
    ],
    verify: (sim) => {
      const swA = byName(sim, "SW-A");
      if (!swA) return { ok: false, message: "SW-A is missing.", hints: ["Restore the template — it ships with switches SW-A and SW-B."] };
      if (!vlanActive(swA) || !swA.vlans?.some((v) => v.id === 10) || !swA.vlans?.some((v) => v.id === 20)) {
        return { ok: false, message: "SW-A needs VLANs 10 and 20.", hints: ["On SW-A: configure terminal, then 'vlan 10' and 'vlan 20'.", "Check with 'show vlan brief'."] };
      }
      const portChecks: [string, number][] = [["eth1", 10], ["eth2", 20], ["eth3", 10], ["eth0", 10]];
      for (const [portId, want] of portChecks) {
        const got = portVlan(swA, portId);
        if (got !== want) {
          return { ok: false, message: `SW-A port ${portId} should be in access VLAN ${want} (it is ${got}).`, hints: ["PC1 + MgmtPC + the R1 link live in VLAN 10; PC2 lives alone in VLAN 20.", "On each port: interface <port> then switchport access vlan <id>."] };
        }
      }
      const r2 = byName(sim, "R2");
      if (!r2 || r2.config.interfaces[0].status !== "up") {
        return { ok: false, message: "R2's LAN interface (Gi0/0) is administratively down.", hints: ["On R2: interface Gi0/0, then no shutdown."] };
      }
      const r1 = byName(sim, "R1");
      if (!r1) return { ok: false, message: "R1 is missing.", hints: ["Restore the template — it ships with routers R1 and R2."] };
      if (!r1.routes.some((rt) => rt.network === "192.168.2.0" && rt.mask === "255.255.255.0" && rt.nextHop === "10.0.0.2")) {
        return { ok: false, message: "R1 has no route to Site B (192.168.2.0/24).", hints: ["On R1: ip route 192.168.2.0 255.255.255.0 10.0.0.2"] };
      }
      if (!r2.routes.some((rt) => rt.network === "192.168.1.0" && rt.mask === "255.255.255.0" && rt.nextHop === "10.0.0.1")) {
        return { ok: false, message: "R2 has no route back to Site A (192.168.1.0/24).", hints: ["On R2: ip route 192.168.1.0 255.255.255.0 10.0.0.1"] };
      }
      const pc4 = byName(sim, "PC4");
      if (!pc4) return { ok: false, message: "PC4 is missing.", hints: ["Keep the template's PC4."] };
      const pc4Iface = pc4.config.interfaces[0];
      if (pc4Iface.ip !== "192.168.2.11" || pc4Iface.mask !== "255.255.255.0" || pc4.config.gateway !== "192.168.2.1") {
        return { ok: false, message: "PC4's addressing is still wrong.", hints: ["PC4 must be 192.168.2.11 / 255.255.255.0 with gateway 192.168.2.1."] };
      }
      const reachable = pingWithHints(sim, byName(sim, "PC1")!, "192.168.2.10");
      if (!reachable.ok) return reachable;
      if (!sim.startupConfigs[r1.id] || !sim.startupConfigs[r2.id]) {
        return { ok: false, message: "R1 or R2 has not saved its startup configuration.", hints: ["On each router, in privileged exec mode run: write memory", "Check with 'show startup-config'."] };
      }
      return { ok: true, message: "Network is up: VLANs isolate guests, routing works across sites, and both routers saved their configs.", hints: [] };
    },
  },
];

function checkPair(sim: NetworkSimulator, a: { id: string; config: { interfaces: { ip?: string }[] } }, b: { id: string; config: { interfaces: { ip?: string }[] } }) {
  const aIp = firstIp(a);
  const bIp = firstIp(b);
  if (!aIp || !bIp) {
    return { ok: false, message: "Both PCs need an IP address in the same network.", hints: ["Give each PC an IP like 192.168.1.10 / 192.168.1.11 with mask 255.255.255.0."] };
  }
  const result = sim.ping(a.id, bIp);
  if (result.ok) return { ok: true, message: result.summary, hints: [] };
  const diag = sim.diagnose(a.id, bIp);
  return { ok: false, message: diag.message, hints: [diag.hint, `Trace: ${result.error ?? "packet stopped before the destination."}`] };
}

export function getMission(slug: string): NetMission | undefined {
  return NET_MISSIONS.find((m) => m.slug === slug);
}

/** The snapshot a mission starts from (null = empty canvas). */
export function missionStart(m: NetMission): SimSnapshot | null {
  if (m.template === "empty") return null;
  return buildTemplate(m.template);
}
