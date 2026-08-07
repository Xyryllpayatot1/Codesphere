// ---------------------------------------------------------------------------
// Windows CMD interpreter for the Networking Lab.
//
// Every command is COMPUTED from the live engine state (a NetSnapshot) — never
// hardcoded, never "confident success". `ping`, `tracert` and `ipconfig /renew`
// delegate to the packet/DHCP engine so the terminal, the Packet Lab, the
// canvas highlight and the mission panel all agree on what happened.
//
// A command returns lines (each with an optional delay so the terminal can
// type them out), an exit code, an optional mutated device, and an optional
// PingFault so failures highlight the responsible devices/cables/interfaces.
// ---------------------------------------------------------------------------

import { formatIp, networkOf, parseIp } from "./ip";
import { DEVICE_TYPES } from "./devices";
import { SERVICE_DEFS, serviceOn } from "./services";
import { SERVER_SERVICE_KEYS } from "./types";
import {
  deviceActivePort,
  deviceByIp,
  dhcpAssign,
  dnsLookup,
  isPoweredOff,
  portKey,
  runPacket,
  unionFind,
  WIFI_PORT,
  type NetSnapshot,
} from "./packets";
import type { Device, PingFault } from "./types";

export type CmdLine = {
  text: string;
  status?: "ok" | "warn" | "error";
  /** ms to wait before printing this line (terminal animation). */
  delay?: number;
};

export type CommandResult = {
  lines: CmdLine[];
  ok: boolean;
  /** The device snapshot after the command ran (e.g. `ipconfig /renew`). */
  device?: Device;
  /** Structured failure explanation (ping/tracert) for canvas highlighting. */
  fault?: PingFault;
  reason?: string;
};

const label = (d: Device) => d.config.hostname || d.config.name || DEVICE_TYPES[d.type].label;
const macWin = (mac: string) => mac.replace(/:/g, "-");

const out = (text: string, extra: Omit<CmdLine, "text"> = {}) => ({ text, ...extra });

const isRouter = (d: Device) => d.type === "router" || d.type === "wirelessRouter" || d.type === "firewall";
const firstIp = (d: Device) => d.config.interfaces.find((i) => i.ip && i.status === "up")?.ip ?? d.config.interfaces.find((i) => i.ip)?.ip;

/** One `Reply from …` line reused by success + failure so both look real. */
const PING_SENT = 4;

// ---------------------------------------------------------------------------
// ping — computed by the packet engine.
// ---------------------------------------------------------------------------

function pingCommand(snap: NetSnapshot, deviceId: string, target: string): CommandResult {
  const r = runPacket(snap, { sourceId: deviceId, target, type: "icmp" });
  const displayTarget = r.target && parseIp(r.target) ? r.target : target;

  const lines: CmdLine[] = [out(`Pinging ${displayTarget} with 32 bytes of data:`)];
  for (let i = 0; i < PING_SENT; i++) {
    lines.push(out(r.summary, { delay: 420, status: r.ok ? "ok" : "error" }));
  }
  lines.push(out(""));
  const received = r.ok ? PING_SENT : 0;
  const lost = PING_SENT - received;
  const pct = Math.round((lost / PING_SENT) * 100);
  lines.push(out(`Ping statistics for ${displayTarget}:`));
  lines.push(out(`    Packets: Sent = ${PING_SENT}, Received = ${received}, Lost = ${lost} (${pct}% loss),`));
  if (r.ok) {
    lines.push(out("Approximate round trip times in milli-seconds:"));
    lines.push(out("    Minimum = 2ms, Maximum = 2ms, Average = 2ms"));
  } else if (r.fault) {
    lines.push(out(r.fault.fix, { status: "warn" }));
  }

  return { lines, ok: r.ok, fault: r.fault, reason: r.reason ?? r.error, device: undefined };
}

// ---------------------------------------------------------------------------
// tracert — walks the trace steps the packet engine produced.
// ---------------------------------------------------------------------------

function tracertCommand(snap: NetSnapshot, deviceId: string, target: string): CommandResult {
  const r = runPacket(snap, { sourceId: deviceId, target, type: "icmp" });
  const targetDev = deviceByIp(snap.devices, r.target)?.device;
  const lines: CmdLine[] = [out(`Tracing route to ${r.target} over a maximum of 30 hops:`), out("")];

  const hops: { ip: string; host: string }[] = [];
  const seen = new Set<string>();
  for (const st of r.steps) {
    if (st.deviceId === deviceId || seen.has(st.deviceId)) continue;
    const dev = snap.devices.find((d) => d.id === st.deviceId);
    if (!dev) continue;
    const isRouterHop = isRouter(dev);
    const isFinal = targetDev?.id === dev.id;
    if (!isRouterHop && !isFinal) continue;
    seen.add(dev.id);
    hops.push({ ip: firstIp(dev) ?? "?", host: label(dev) });
  }

  hops.forEach((h, i) => lines.push(out(`  ${i + 1}  ${h.ip.padEnd(15)} ${h.host}  [2ms]`, { delay: 320 })));
  if (r.ok) {
    lines.push(out(""));
    lines.push(out("Trace complete.", { status: "ok" }));
  } else {
    lines.push(out(""));
    lines.push(out(r.summary, { status: "error" }));
    if (r.fault) lines.push(out(r.fault.fix, { status: "warn" }));
  }
  return { lines, ok: r.ok, fault: r.fault, reason: r.reason ?? r.error, device: undefined };
}

// ---------------------------------------------------------------------------
// ipconfig — computed from the device's actual interface state.
// ---------------------------------------------------------------------------

function ipconfigCommand(snap: NetSnapshot, device: Device, all: boolean): CommandResult {
  const lines: CmdLine[] = [out("Windows IP Configuration"), out("")];
  const activePort = deviceActivePort(snap.devices, device.id, snap.wirelessLinks);
  const upIf = device.config.interfaces.find((i) => i.status === "up");

  const blocks: { title: string; iface: Device["config"]["interfaces"][number] | null }[] = [];
  for (const i of device.config.interfaces) {
    if (i.kind === "console" || i.kind === "serial") continue;
    blocks.push({
      title: i.kind === "wireless" || (i.id === WIFI_PORT) ? "Wireless LAN adapter Wi-Fi:" : `Ethernet adapter ${i.label ?? i.id}:`,
      iface: i,
    });
  }
  if (device.config.wlan && activePort === WIFI_PORT && !blocks.some((b) => b.iface?.kind === "wireless")) {
    blocks.push({ title: "Wireless LAN adapter Wi-Fi:", iface: null });
  }

  const anyIp = device.config.interfaces.some((i) => i.ip);
  const connected = upIf !== undefined || activePort !== null;

  for (const b of blocks) {
    lines.push(out(b.title));
    lines.push(out(""));
    if (!connected || !anyIp) {
      lines.push(out("   Media disconnected . . . : Yes"));
      lines.push(out(""));
      continue;
    }
    const iface = b.iface ?? device.config.interfaces.find((i) => i.ip);
    if (!iface?.ip) {
      lines.push(out("   Media disconnected . . . : Yes"));
      lines.push(out(""));
      continue;
    }
    lines.push(out(`   Connection-specific DNS Suffix  . : ${device.config.dns ? reverseDns(device.config.dns) : ""}`));
    lines.push(out(`   IPv4 Address. . . . . . . . . . . : ${iface.ip}`));
    lines.push(out(`   Subnet Mask . . . . . . . . . . . : ${iface.mask ?? "255.255.255.0"}`));
    lines.push(out(`   Default Gateway . . . . . . . . . : ${device.config.gateway ?? ""}`));
    if (all) {
      lines.push(out(`   Physical Address. . . . . . . . . : ${macWin(device.config.mac)}`));
      lines.push(out(`   DHCP Enabled. . . . . . . . . . . : ${device.config.dhcp ? "Yes" : "No"}`));
      lines.push(out(`   DHCP Server . . . . . . . . . . . : ${dhcpServerIp(snap, device) ?? ""}`));
      lines.push(out(`   DNS Servers . . . . . . . . . . . : ${device.config.dns ?? ""}`));
    }
    lines.push(out(""));
  }
  if (blocks.length === 0) {
    lines.push(out("   No adapters configured."));
  }
  return { lines, ok: true };
}

function reverseDns(ip: string): string {
  return ip.replace(/\./g, "-") + ".netlab";
}

function dhcpServerIp(snap: NetSnapshot, device: Device): string | null {
  const srcPort = deviceActivePort(snap.devices, device.id, snap.wirelessLinks);
  if (!srcPort) return null;
  const find = unionFind(snap.devices, snap.cables, snap.wirelessLinks);
  const myRoot = find(portKey(device.id, srcPort));
  for (const d of snap.devices) {
    if (isPoweredOff(d) || !d.dhcpPool) continue;
    const dPort = deviceActivePort(snap.devices, d.id, snap.wirelessLinks) ?? d.config.interfaces.find((i) => i.status === "up")?.id;
    if (!dPort) continue;
    if (find(portKey(d.id, dPort)) === myRoot) return firstIp(d) ?? null;
  }
  return null;
}

function renewCommand(snap: NetSnapshot, device: Device): CommandResult {
  const res = dhcpAssign(snap, device.id);
  const lines: CmdLine[] = [out("C:\\> ipconfig /renew")];
  for (const s of res.steps) {
    lines.push(out(`  [${s.layer}] ${s.deviceLabel} — ${s.action}: ${s.detail}`, { delay: 120 }));
  }
  if (res.ok && res.device) {
    lines.push(out(res.summary, { status: "ok" }));
    return { lines, ok: true, device: res.device };
  }
  lines.push(out(res.error ?? res.summary, { status: "error" }));
  return { lines, ok: false, reason: res.error ?? res.summary };
}

function releaseCommand(device: Device): CommandResult {
  const cleared: Device = {
    ...device,
    config: {
      ...device.config,
      dhcp: true,
      gateway: undefined,
      dns: undefined,
      interfaces: device.config.interfaces.map((i) => (i.ip ? { ...i, ip: undefined, mask: undefined } : i)),
    },
  };
  return {
    lines: [out(""), out("Windows IP Configuration"), out(""), out("No operation can be performed while the media is disconnected."), out("")],
    ok: true,
    device: cleared,
  };
}

// ---------------------------------------------------------------------------
// arp -a — derived from the device's own L2 segment.
// ---------------------------------------------------------------------------

function arpCommand(snap: NetSnapshot, device: Device): CommandResult {
  const lines: CmdLine[] = [];
  const srcPort = deviceActivePort(snap.devices, device.id, snap.wirelessLinks);
  const srcIp = firstIp(device);
  if (!srcPort || !srcIp) {
    lines.push(out("No ARP entries found."));
    return { lines, ok: true };
  }
  const find = unionFind(snap.devices, snap.cables, snap.wirelessLinks);
  const myRoot = find(portKey(device.id, srcPort));
  const seen = new Set<string>();
  lines.push(out(`Interface: ${srcIp} --- 0x${device.config.interfaces.findIndex((i) => i.ip) + 1}`));
  lines.push(out("  Internet Address      Physical Address      Type"));
  const add = (dIp: string, dMac: string) => {
    if (seen.has(dIp)) return;
    seen.add(dIp);
    lines.push(out(`  ${dIp.padEnd(21)} ${macWin(dMac).padEnd(21)} dynamic`));
  };
  for (const d of snap.devices) {
    if (d.id === device.id || isPoweredOff(d)) continue;
    const dPort = deviceActivePort(snap.devices, d.id, snap.wirelessLinks);
    if (!dPort) continue;
    const dIp = firstIp(d);
    if (!dIp) continue;
    if (find(portKey(d.id, dPort)) === myRoot) add(dIp, d.config.mac);
  }
  if (device.config.gateway) {
    const gw = deviceByIp(snap.devices, device.config.gateway)?.device;
    if (gw && !isPoweredOff(gw)) add(device.config.gateway, gw.config.mac);
  }
  return { lines, ok: true };
}

function nslookupCommand(snap: NetSnapshot, device: Device, name: string): CommandResult {
  const lines: CmdLine[] = [];
  lines.push(out(`Server:  ${device.config.dns ?? "(auto — first DNS server on the segment)"}`));
  lines.push(out("Address:  " + (device.config.dns ?? "auto")));
  lines.push(out(""));
  const lookup = dnsLookup(snap, name, device.config.dns);
  if (lookup.refused) {
    lines.push(out(`DNS request timed out — the DNS server is not answering.`, { status: "error" }));
    return { lines, ok: false, reason: "The DNS server is offline or its DNS service is disabled." };
  }
  if (!lookup.ip) {
    lines.push(out(`*** ${name} could not be found.`, { status: "error" }));
    return { lines, ok: false, reason: `No DNS record for "${name}".` };
  }
  lines.push(out(`Name:    ${name}`, { status: "ok" }));
  lines.push(out(`Address: ${lookup.ip}`, { status: "ok" }));
  return { lines, ok: true };
}

// ---------------------------------------------------------------------------
// show … — small router-flavoured helpers (aliases accepted everywhere).
// ---------------------------------------------------------------------------

function showCommand(snap: NetSnapshot, device: Device, sub: string): CommandResult {
  const lines: CmdLine[] = [];
  switch (sub) {
    case "interfaces": {
      lines.push(out("Interface              Status     IP Address       Subnet Mask       Description"));
      for (const i of device.config.interfaces) {
        lines.push(
          out(
            `${(i.label ?? i.id).padEnd(22)} ${i.status.padEnd(11)} ${(i.ip ?? "unassigned").padEnd(16)} ${(i.mask ?? "–").padEnd(16)} ${i.description ?? ""}`
          )
        );
      }
      break;
    }
    case "ip": {
      const ip = firstIp(device);
      lines.push(out(`IPv4 address . . . . . . . . . : ${ip ?? "None"}`));
      lines.push(out(`Subnet mask . . . . . . . . . . : ${device.config.interfaces.find((i) => i.ip)?.mask ?? "None"}`));
      lines.push(out(`Default gateway . . . . . . . . : ${device.config.gateway ?? "None"}`));
      lines.push(out(`DNS server . . . . . . . . . . . : ${device.config.dns ?? "None"}`));
      lines.push(out(`DHCP enabled . . . . . . . . . . : ${device.config.dhcp ? "Yes" : "No"}`));
      break;
    }
    case "routes": {
      lines.push(out("Network             Mask                Next Hop"));
      for (const r of device.routes) {
        lines.push(out(`${r.network.padEnd(20)} ${r.mask.padEnd(20)} ${r.nextHop}`));
      }
      for (const i of device.config.interfaces) {
        if (i.ip && i.status === "up") {
          const net = networkOf(parseIp(i.ip)!, i.mask ?? "255.255.255.0");
          lines.push(out(`${formatIp(net).padEnd(20)} ${(i.mask ?? "").padEnd(20)} Connected (${i.label ?? i.id})`));
        }
      }
      break;
    }
    case "version": {
      lines.push(out("Network Lab Simulator (NSIM), Version 16.0"));
      lines.push(out(`Copyright (c) 2026. Hostname: ${label(device)}`));
      lines.push(out(`MAC address: ${device.config.mac}  ·  powered ${device.poweredOn === false ? "OFF" : "on"}`));
      break;
    }
    case "services": {
      if (device.type !== "server" && device.type !== "cloud") {
        lines.push(out("This device does not host services.", { status: "error" }));
        break;
      }
      lines.push(out("Service              Port  Proto  Status"));
      for (const k of SERVER_SERVICE_KEYS) {
        const def = SERVICE_DEFS[k];
        const on = serviceOn(device, k);
        lines.push(out(`  ${def.label.padEnd(20)} ${String(def.port).padEnd(5)} ${def.protocol.padEnd(6)} ${on ? "RUNNING" : "STOPPED"}`, { status: on ? "ok" : "error" }));
      }
      break;
    }
    default:
      lines.push(out("Available: show interfaces · show ip · show routes · show version · show services"));
  }
  return { lines, ok: true };
}

// ---------------------------------------------------------------------------
// Entry point.
// ---------------------------------------------------------------------------

export function runCommand(snap: NetSnapshot, deviceId: string, input: string): CommandResult {
  const device = snap.devices.find((d) => d.id === deviceId);
  if (!device) {
    return { lines: [out(`'${input}' is not recognized as an internal or external command.`, { status: "error" })], ok: false, reason: "Device not found." };
  }

  const tokens = input.trim().split(/\s+/);
  const cmd = tokens[0]?.toLowerCase() ?? "";
  const arg = tokens.slice(1).join(" ");

  switch (cmd) {
    case "ping":
      if (!arg) return err("Usage: ping <host-or-ip>", false);
      return pingCommand(snap, deviceId, arg);

    case "tracert":
    case "traceroute":
      if (!arg) return err("Usage: tracert <host-or-ip>", false);
      return tracertCommand(snap, deviceId, arg);

    case "ipconfig":
      if (tokens[1]?.toLowerCase() === "/renew") return renewCommand(snap, device);
      if (tokens[1]?.toLowerCase() === "/release") return releaseCommand(device);
      return ipconfigCommand(snap, device, tokens[1]?.toLowerCase() === "/all");

    case "arp":
      if (tokens[1]?.toLowerCase() === "-a" || tokens[1]?.toLowerCase() === "-a /n" || !tokens[1]) return arpCommand(snap, device);
      return err("Usage: arp -a", false);

    case "nslookup":
      if (!arg) return err("Usage: nslookup <hostname>", false);
      return nslookupCommand(snap, device, arg);

    case "hostname":
      return { lines: [out(label(device))], ok: true };

    case "show":
      return showCommand(snap, device, tokens[1]?.toLowerCase() ?? "");

    case "help":
    case "?":
      return { lines: helpLines(), ok: true };

    case "ver":
      return { lines: [out(`Microsoft Windows [Version 10.0.22631]`), out(`(c) Network Lab Simulator 2026`)], ok: true };

    default:
      return err(`'${input}' is not recognized as an internal or external command.`, false);
  }
}

function err(text: string, ok: boolean): CommandResult {
  return { lines: [out(text, { status: "error" })], ok, reason: text };
}

function helpLines(): CmdLine[] {
  return [
    out("For more information on a specific command, type HELP command-name"),
    out(""),
    out("ARP                Displays and modifies the IP-to-Physical address translation tables"),
    out("CLS                Clears the screen"),
    out("EXIT               Quits the CMD.EXE program (closes this window)"),
    out("HOSTNAME           Prints the name of this device"),
    out("IPCONFIG           Displays the IP configuration (use /all for details, /renew to request DHCP)"),
    out("NSLOOKUP           Asks the DNS server for the address of a hostname"),
    out("PING               Sends ICMP echo requests to a host or IP"),
    out("SHOW               Show interfaces / ip / routes / services / version"),
    out("TRACERT            Traces the route a packet takes to a host or IP"),
    out("VER                Displays the simulator version"),
    out(""),
    out("Tip: use the UP arrow for history and TAB to autocomplete."),
  ];
}

// ---------------------------------------------------------------------------
// Autocomplete + inline teaching for the terminal.
// ---------------------------------------------------------------------------

export function cmdSuggestions(snap: NetSnapshot, deviceId: string, input: string): { cmd: string; explain: string }[] {
  const pingTargets: string[] = [];
  const tracertTargets: string[] = [];
  for (const d of snap.devices) {
    if (d.id === deviceId || d.poweredOn === false) continue;
    const ip = firstIp(d);
    if (ip) {
      pingTargets.push(ip);
      tracertTargets.push(ip);
    }
  }
  const pingFirst = pingTargets[0] ?? "192.168.1.2";

  const all: { cmd: string; explain: string }[] = [
    { cmd: `ping ${pingFirst}`, explain: "Send 4 ICMP echo requests to a device and measure replies." },
    { cmd: `tracert ${tracertTargets[0] ?? pingFirst}`, explain: "Show the layer-3 hops a packet takes to reach the destination." },
    { cmd: "ipconfig", explain: "Show this device's IPv4 address, mask and gateway." },
    { cmd: "ipconfig /all", explain: "Show full IP configuration (MAC, DHCP server, DNS)." },
    { cmd: "ipconfig /renew", explain: "Request a fresh address from the DHCP server on this segment." },
    { cmd: "arp -a", explain: "Show the IP → MAC (ARP) table for the segment this device is on." },
    { cmd: "hostname", explain: "Print the device name." },
    { cmd: "show interfaces", explain: "List every interface with status, IP and description." },
    { cmd: "show ip", explain: "Show the device's IP settings." },
    { cmd: "show routes", explain: "Show the routing table (connected + static routes)." },
    { cmd: "show version", explain: "Show device + simulator info." },
    { cmd: "help", explain: "List available commands." },
    { cmd: "cls", explain: "Clear the screen." },
    { cmd: "exit", explain: "Close the command prompt." },
  ];

  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return all.slice(0, 7);

  // Ping / tracert argument completion: hostnames and IPs.
  const argMatch = trimmed.match(/^(ping|tracert)\s+$/);
  if (argMatch) {
    const verb = argMatch[1];
    const targets = snap.devices
      .filter((d) => d.id !== deviceId && d.poweredOn !== false && firstIp(d))
      .map((d) => ({ cmd: `${verb} ${firstIp(d)}`, explain: `${label(d)} (${firstIp(d)})` }));
    return targets.slice(0, 7);
  }

  return all
    .filter((s) => s.cmd.toLowerCase().startsWith(trimmed) || s.cmd.toLowerCase().includes(trimmed))
    .slice(0, 7);
}
