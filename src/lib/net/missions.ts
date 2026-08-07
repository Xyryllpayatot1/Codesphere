// ---------------------------------------------------------------------------
// Networking missions — the scaffolding for the /networking activities.
//
// Each mission ships a starting state (one of the four templates, or empty)
// and a pure `verify(sim)` check that only inspects a NetworkSimulator. The
// exact same function runs in the browser (live mission panel) and server-side
// (submit route, on the snapshot the client sends), so rewards are only
// granted when the network really works.
// ---------------------------------------------------------------------------

import { NetworkSimulator, buildTemplate } from "./sim";
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
  template: "empty" | "small-lan" | "two-router" | "wifi" | "internet";
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
