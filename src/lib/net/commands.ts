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

import { formatIp, maskToBits, networkOf, parseIp } from "./ip";
import { DEVICE_TYPES } from "./devices";
import { cableStatus } from "./cables";
import { SERVICE_DEFS, serviceOn } from "./services";
import { SERVER_SERVICE_KEYS } from "./types";
import {
  arpCache,
  deviceActivePort,
  deviceByIp,
  dhcpAssign,
  dnsLookup,
  isPoweredOff,
  portVlan,
  runPacket,
  sameL2Segment,
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

/** Cisco IOS privilege modes for the NOS CLI. */
export type IosMode = "user" | "privileged" | "global" | "interface" | "vlan";

/** Terminal session state the interpreter advances as the user works. */
export type CliContext = {
  mode: IosMode;
  /** Active interface when mode === "interface". */
  interfaceId?: string;
  /** Active VLAN when mode === "vlan". */
  vlanId?: number;
};

export type CommandResult = {
  lines: CmdLine[];
  ok: boolean;
  /** The device snapshot after the command ran (e.g. `ipconfig /renew`). */
  device?: Device;
  /** Structured failure explanation (ping/tracert) for canvas highlighting. */
  fault?: PingFault;
  reason?: string;
  /** Set by `saveconfig` so the store persists the startup config. */
  configSaved?: boolean;
  /** The CLI context after the command (IOS devices). */
  ctx?: CliContext;
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
  for (const d of snap.devices) {
    if (isPoweredOff(d) || !d.dhcpPool) continue;
    const dPort = deviceActivePort(snap.devices, d.id, snap.wirelessLinks) ?? d.config.interfaces.find((i) => i.status === "up")?.id;
    if (!dPort) continue;
    if (sameL2Segment(snap, { deviceId: device.id, portId: srcPort }, { deviceId: d.id, portId: dPort })) return firstIp(d) ?? null;
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
    if (sameL2Segment(snap, { deviceId: device.id, portId: srcPort }, { deviceId: d.id, portId: dPort })) add(dIp, d.config.mac);
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
      lines.push(out("Interface              Status     Link       IP Address       Subnet Mask       Description"));
      for (const i of device.config.interfaces) {
        lines.push(
          out(
            `${(i.label ?? i.id).padEnd(22)} ${i.status.padEnd(11)} ${linkState(snap, device, i).padEnd(10)} ${(i.ip ?? "unassigned").padEnd(16)} ${(i.mask ?? "–").padEnd(16)} ${i.description ?? ""}`
          )
        );
      }
      break;
    }
    case "running-config": {
      lines.push(out("-- Running configuration --", { status: "ok" }));
      lines.push(...configLines(device));
      break;
    }
    case "startup-config": {
      const saved = snap.startupConfigs?.[device.id];
      if (!saved) {
        lines.push(out("Startup configuration not found. Use SAVECONFIG to save the running configuration.", { status: "warn" }));
        break;
      }
      lines.push(out("-- Startup configuration --", { status: "ok" }));
      lines.push(
        ...configLines({
          ...device,
          config: { ...device.config, hostname: saved.hostname, interfaces: saved.interfaces },
          routes: saved.routes,
        })
      );
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
      lines.push(out("Available: show interfaces · show ip · show routes · show version · show services · show running-config · show startup-config"));
  }
  return { lines, ok: true };
}

// ---------------------------------------------------------------------------
// Running vs startup configuration.
// ---------------------------------------------------------------------------

/** A neutral, human-readable rendering of a device's config (hostname, DHCP,
 * every interface with IP/mask/status, and the routing table). Shared by
 * `show running-config` and `show startup-config`. */
function configLines(device: Device): CmdLine[] {
  const lines: CmdLine[] = [];
  lines.push(out(`hostname ${device.config.hostname}`));
  lines.push(out(`ip dhcp ${device.config.dhcp ? "enabled" : "disabled"}`));
  for (const i of device.config.interfaces) {
    const parts = [`interface ${i.label ?? i.id}`, `  status ${i.status}`];
    if (i.ip) parts.push(`  ip ${i.ip} / ${i.mask ?? "255.255.255.0"}`);
    if (i.description) parts.push(`  description ${i.description}`);
    lines.push(out(parts.join("  ")));
  }
  for (const r of device.routes) {
    lines.push(out(`ip route ${r.network} / ${r.mask}  ->  ${r.nextHop}`));
  }
  if (device.routes.length === 0) lines.push(out("ip route (none)"));
  return lines;
}

/** The operational link state of an interface: what the attached cable (if
 * any) currently carries. Admin state is `status`; link state is this. */
function linkState(snap: NetSnapshot, device: Device, iface: Device["config"]["interfaces"][number]): string {
  const c = snap.cables.find((x) => (x.fromDevice === device.id && x.fromPort === iface.id) || (x.toDevice === device.id && x.toPort === iface.id));
  if (!c) return "no-cable";
  const st = cableStatus(c, snap.devices);
  if (st === "error") return "error";
  if (st === "down") return "down";
  return "up";
}

/** `saveconfig` — the store persists the running config as the startup config. */
function saveConfigCommand(device: Device): CommandResult {
  return {
    lines: [
      out("Saving the running configuration as the startup configuration…", { delay: 200 }),
      out(`${device.config.hostname}: startup configuration saved.`, { status: "ok" }),
    ],
    ok: true,
    configSaved: true,
  };
}

/** `reload` — restore the device from its saved startup configuration. */
function reloadCommand(snap: NetSnapshot, device: Device): CommandResult {
  const saved = snap.startupConfigs?.[device.id];
  const lines: CmdLine[] = [out(`Restarting ${label(device)}…`, { delay: 200 })];
  if (!saved) {
    lines.push(out("No startup configuration saved for this device — the running configuration is kept.", { status: "warn" }));
    return { lines, ok: true };
  }
  lines.push(out("Loading startup configuration…", { delay: 250 }));
  const restored: Device = {
    ...device,
    config: {
      ...device.config,
      hostname: saved.hostname,
      interfaces: JSON.parse(JSON.stringify(saved.interfaces)) as Device["config"]["interfaces"],
    },
    routes: JSON.parse(JSON.stringify(saved.routes)) as Device["routes"],
  };
  lines.push(out(`${saved.hostname} reloaded (${saved.interfaces.length} interfaces, ${saved.routes.length} routes).`, { status: "ok" }));
  return { lines, ok: true, device: restored };
}

// ---------------------------------------------------------------------------
// Cisco IOS interpreter for the NOS activities.
//
// Every command is still computed from the live engine state: `ping`/`tracert`
// use the packet engine, `show` reads the real interfaces/routes/MAC tables/
// VLANs, and configuration commands mutate a NEW device the store applies.
// The context tracks the privilege mode so students must `enable` and enter
// configuration modes, exactly like a real router.
// ---------------------------------------------------------------------------

const IOS_BANNER = "Cisco IOS XE, Network Lab Simulator (NSIM)";

function cloneDevice(d: Device): Device {
  return JSON.parse(JSON.stringify(d)) as Device;
}

function findIface(d: Device, name: string) {
  const n = name.toLowerCase();
  return d.config.interfaces.find((i) => i.label?.toLowerCase() === n || i.id.toLowerCase() === n);
}

function macIos(mac: string): string {  const hex = mac.replace(/:/g, "");
  return `${hex.slice(0, 4)}.${hex.slice(4, 8)}.${hex.slice(8, 12)}`;
}

function runIosCommand(snap: NetSnapshot, device: Device, input: string, ctx: CliContext): CommandResult {
  const trimmed = input.trim();
  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0]?.toLowerCase() ?? "";
  const args = tokens.slice(1);
  const argStr = args.join(" ");
  const next = (patch: Partial<CliContext>): CliContext => ({ ...ctx, ...patch });
  const keep = (): CliContext => next({});

  // `do <command>` runs a privileged command without leaving config mode.
  if (cmd === "do" && args.length > 0) {
    const r = runIosCommand(snap, device, argStr, { mode: "privileged" });
    return { ...r, ctx: keep(), device: r.device };
  }

  // Common abbreviations kept for student comfort.
  const normalized = (c: string) =>
    c === "en" ? "enable" : c === "conf" && args[0]?.toLowerCase() === "t" ? "configure terminal" : c === "int" ? "interface" : c === "sh" ? "show" : c;

  switch (ctx.mode) {
    // ------------------------------------------------------------- user mode
    case "user": {
      const c = normalized(cmd);
      if (c === "enable") {
        return { lines: [out(""), out("Password:"), out(""), out("Entering privileged mode.", { status: "ok" })], ok: true, ctx: next({ mode: "privileged" }) };
      }
      if (c === "show" || c === "?" || c === "help") {
        const sub = argStr.toLowerCase();
        if (c === "show") return { ...iosShow(snap, device, sub), ctx: keep() };
        return { lines: [out("Exec commands:"), out("  enable    Enter privileged (exec) mode"), out("  show      Show running system information"), out("  exit      End the session"), out("  ?         List commands")], ok: true, ctx: keep() };
      }
      if (c === "exit" || c === "logout" || c === "quit") {
        return { lines: [out("Connection closed by foreign host."), out("")], ok: true, ctx: keep() };
      }
      return { lines: [out(""), out(`% Invalid input detected at '^' marker.`, { status: "error" }), out(`Type '?' or 'help' for a list of user-mode commands.`)], ok: false, ctx: keep(), reason: "Invalid user-mode command." };
    }

    // -------------------------------------------------------- privileged mode
    case "privileged": {
      const c = normalized(cmd);
      if (c === "disable") return { lines: [out("")], ok: true, ctx: next({ mode: "user" }) };
      if (c === "configure" && args[0]?.toLowerCase() === "terminal") {
        return { lines: [out("Enter configuration commands, one per line.  End with CNTL/Z."), out("")], ok: true, ctx: next({ mode: "global" }) };
      }
      if (c === "show") return { ...iosShow(snap, device, argStr.toLowerCase()), ctx: keep() };
      if (c === "ping") {
        if (!argStr) return { lines: [out("Usage: ping <host-or-ip>", { status: "error" })], ok: false, ctx: keep(), reason: "Missing target." };
        return { ...pingCommand(snap, device.id, argStr), ctx: keep() };
      }
      if (c === "tracert" || c === "trace" || c === "traceroute") {
        if (!argStr) return { lines: [out("Usage: traceroute <host-or-ip>", { status: "error" })], ok: false, ctx: keep(), reason: "Missing target." };
        return { ...tracertCommand(snap, device.id, argStr), ctx: keep() };
      }
      if (c === "write" && args[0]?.toLowerCase() === "memory") return { ...saveConfigCommand(device), ctx: keep() };
      if (c === "copy" && args[0]?.toLowerCase() === "running-config" && args[1]?.toLowerCase() === "startup-config") return { ...saveConfigCommand(device), ctx: keep() };
      if (c === "saveconfig" || c === "save") return { ...saveConfigCommand(device), ctx: keep() };
      if (c === "reload") return { ...reloadCommand(snap, device), ctx: keep() };
      if (c === "exit" || c === "quit") return { lines: [out("")], ok: true, ctx: next({ mode: "user" }) };
      if (c === "?" || c === "help") {
        return { lines: [out("Privileged exec commands:"), out("  configure terminal   Enter global configuration mode"), out("  show                 Show running system information"), out("  ping / traceroute    Test reachability"), out("  write memory         Save the running configuration"), out("  copy running-config startup-config   Save the configuration"), out("  reload               Reboot, restoring the saved startup config"), out("  disable              Leave privileged mode"), out("  ?                    List commands")], ok: true, ctx: keep() };
      }
      return { lines: [out(`% Invalid input detected at '^' marker.`, { status: "error" }), out(`Type '?' or 'help' for a list of privileged commands.`)], ok: false, ctx: keep(), reason: "Invalid privileged command." };
    }

    // ------------------------------------------------------- global config mode
    case "global": {
      const c = normalized(cmd);
      if (c === "hostname") {
        if (!argStr || /\s/.test(argStr)) return { lines: [out("Usage: hostname <name>", { status: "error" })], ok: false, ctx: keep(), reason: "Hostname must be a single word." };
        const d = cloneDevice(device);
        d.config.hostname = argStr;
        return { lines: [out(`% Enter hostname: ${argStr}`, { delay: 150 }), out("", { delay: 100 })], ok: true, device: d, ctx: keep() };
      }
      if (c === "interface") {
        if (!argStr) return { lines: [out("Usage: interface <name> (e.g. GigabitEthernet0/0)", { status: "error" })], ok: false, ctx: keep(), reason: "Missing interface." };
        const iface = findIface(device, argStr);
        if (!iface) return { lines: [out(`% Interface ${argStr} does not exist`, { status: "error" })], ok: false, ctx: keep(), reason: `Unknown interface ${argStr}.` };
        return { lines: [out(`Configuring interface ${iface.label ?? iface.id}`), out("")], ok: true, ctx: next({ mode: "interface", interfaceId: iface.id }) };
      }
      if (c === "vlan") {
        const id = parseInt(args[0] ?? "", 10);
        if (!Number.isInteger(id) || id < 1 || id > 4094) return { lines: [out("Usage: vlan <1-4094>", { status: "error" })], ok: false, ctx: keep(), reason: "Invalid VLAN id." };
        const d = cloneDevice(device);
        if (!d.vlans?.some((v) => v.id === id)) d.vlans = [...(d.vlans ?? [{ id: 1, name: "default" }]), { id, name: `VLAN${id}` }];
        return { lines: [out(`% Enter VLAN configuration mode for VLAN ${id}.`, { delay: 120 }), out("")], ok: true, device: d, ctx: next({ mode: "vlan", vlanId: id }) };
      }
      if (c === "ip" && args[0]?.toLowerCase() === "route") {
        if (args.length < 4) return { lines: [out("Usage: ip route <network> <mask> <next-hop>", { status: "error" })], ok: false, ctx: keep(), reason: "Missing route parameters." };
        const [, network, mask, nextHop] = args;
        if (!parseIp(network) || !parseIp(mask) || !parseIp(nextHop)) return { lines: [out("% Invalid network, mask or next-hop address", { status: "error" })], ok: false, ctx: keep(), reason: "Invalid route addresses." };
        const d = cloneDevice(device);
        d.routes = d.routes.filter((r) => !(r.network === network && r.mask === mask));
        d.routes.push({ id: `rt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, network, mask, nextHop });
        return { lines: [out(`% Route to ${network}/${maskToBits(mask)} via ${nextHop} installed`, { delay: 120 })], ok: true, device: d, ctx: keep() };
      }
      if (c === "no" && args[0]?.toLowerCase() === "ip" && args[1]?.toLowerCase() === "route") {
        const network = args[2] ?? "";
        const mask = args[3] ?? "";
        const d = cloneDevice(device);
        const removed = d.routes.length;
        d.routes = d.routes.filter((r) => !(r.network === network && (!mask || r.mask === mask)));
        return { lines: [out(removed === d.routes.length ? `% No route to ${network} found` : `% Route to ${network} removed`, { status: removed === d.routes.length ? "warn" : "ok" })], ok: true, device: d, ctx: keep() };
      }
      if (c === "exit") return { lines: [out("")], ok: true, ctx: next({ mode: "privileged" }) };
      if (c === "end" || c === "ctrl-z") return { lines: [out(""), out("%SYS-5-CONFIG_I: Configured from console by console")], ok: true, ctx: next({ mode: "privileged" }) };
      if (c === "?" || c === "help") {
        return { lines: [out("Global configuration commands:"), out("  hostname <name>      Set the device hostname"), out("  interface <name>     Enter interface configuration mode"), out("  ip route <net> <mask> <next-hop>   Add a static route"), out("  no ip route <net> <mask>   Remove a static route"), out("  vlan <1-4094>        Enter VLAN configuration"), out("  exit                 Return to privileged mode"), out("  end                  Return to privileged mode"), out("  do <command>         Run a privileged command from here")], ok: true, ctx: keep() };
      }
      return { lines: [out(`% Invalid input detected at '^' marker.`, { status: "error" }), out(`Type '?' or 'help' for global configuration commands.`)], ok: false, ctx: keep(), reason: "Invalid global config command." };
    }

    // ------------------------------------------------------- interface config mode
    case "interface": {
      const c = normalized(cmd);
      const ifaceName = device.config.interfaces.find((i) => i.id === ctx.interfaceId)?.label ?? ctx.interfaceId;
      if (c === "ip" && args[0]?.toLowerCase() === "address") {
        const [addr, mask] = [args[1], args[2]];
        if (!addr || !mask || !parseIp(addr) || !parseIp(mask)) return { lines: [out("Usage: ip address <A.B.C.D> <M.M.M.M>", { status: "error" })], ok: false, ctx: keep(), reason: "Invalid IP address or mask." };
        const d = cloneDevice(device);
        const i = d.config.interfaces.find((x) => x.id === ctx.interfaceId);
        if (!i) return { lines: [out("% No active interface", { status: "error" })], ok: false, ctx: keep() };
        i.ip = addr;
        i.mask = mask;
        return { lines: [out(`% Configured ${ifaceName} with ${addr}/${maskToBits(mask)}`, { delay: 120 })], ok: true, device: d, ctx: keep() };
      }
      if (c === "no" && args[0]?.toLowerCase() === "ip" && args[1]?.toLowerCase() === "address") {
        const d = cloneDevice(device);
        const i = d.config.interfaces.find((x) => x.id === ctx.interfaceId);
        if (i) {
          i.ip = undefined;
          i.mask = undefined;
        }
        return { lines: [out(`% Removed IP address from ${ifaceName}`)], ok: true, device: d, ctx: keep() };
      }
      if (c === "shutdown") {
        const d = cloneDevice(device);
        const i = d.config.interfaces.find((x) => x.id === ctx.interfaceId);
        if (i) i.status = "down";
        return { lines: [out(`% Interface ${ifaceName} administratively down`, { delay: 120 })], ok: true, device: d, ctx: keep() };
      }
      if (c === "no" && args[0]?.toLowerCase() === "shutdown") {
        const d = cloneDevice(device);
        const i = d.config.interfaces.find((x) => x.id === ctx.interfaceId);
        if (i) i.status = "up";
        return { lines: [out(`% Interface ${ifaceName} is up`, { delay: 120 })], ok: true, device: d, ctx: keep() };
      }
      if (c === "description") {
        const d = cloneDevice(device);
        const i = d.config.interfaces.find((x) => x.id === ctx.interfaceId);
        if (i) i.description = argStr || undefined;
        return { lines: [out(`% Description set on ${ifaceName}`)], ok: true, device: d, ctx: keep() };
      }
      if (c === "switchport") {
        const d = cloneDevice(device);
        const i = d.config.interfaces.find((x) => x.id === ctx.interfaceId);
        if (!i) return { lines: [out("% No active interface", { status: "error" })], ok: false, ctx: keep() };
        if (device.type !== "switch") return { lines: [out("% Switchport command only valid on switches", { status: "error" })], ok: false, ctx: keep(), reason: "Only switches have switchports." };
        const sub = args[0]?.toLowerCase();
        if (sub === "mode" && args[1]?.toLowerCase() === "access") {
          i.trunk = false;
          return { lines: [out(`% Interface ${ifaceName} is now an access port`, { delay: 100 })], ok: true, device: d, ctx: keep() };
        }
        if (sub === "mode" && args[1]?.toLowerCase() === "trunk") {
          i.trunk = true;
          i.accessVlan = undefined;
          return { lines: [out(`% Interface ${ifaceName} is now a trunk port (carries all VLANs)`, { delay: 100 })], ok: true, device: d, ctx: keep() };
        }
        if (sub === "access" && args[1]?.toLowerCase() === "vlan") {
          const vlan = parseInt(args[2] ?? "", 10);
          if (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094) return { lines: [out("Usage: switchport access vlan <1-4094>", { status: "error" })], ok: false, ctx: keep(), reason: "Invalid VLAN id." };
          if (!d.vlans?.some((v) => v.id === vlan)) d.vlans = [...(d.vlans ?? [{ id: 1, name: "default" }]), { id: vlan, name: `VLAN${vlan}` }];
          i.trunk = false;
          i.accessVlan = vlan;
          return { lines: [out(`% Interface ${ifaceName} now in access VLAN ${vlan}`, { delay: 100 })], ok: true, device: d, ctx: keep() };
        }
        return { lines: [out("Usage: switchport mode access|trunk  ·  switchport access vlan <1-4094>", { status: "error" })], ok: false, ctx: keep(), reason: "Invalid switchport command." };
      }
      if (c === "exit") return { lines: [out("")], ok: true, ctx: next({ mode: "global" }) };
      if (c === "end") return { lines: [out("%SYS-5-CONFIG_I: Configured from console by console")], ok: true, ctx: next({ mode: "privileged" }) };
      if (c === "?" || c === "help") {
        return { lines: [out("Interface configuration commands:"), out(`  ip address <A.B.C.D> <M.M.M.M>   Set the interface IP + mask`), out("  no ip address          Remove the interface IP"), out("  shutdown / no shutdown Enable or disable the interface"), out("  description <text>     Set a human-readable description"), out("  switchport mode access|trunk   Set the switchport type"), out("  switchport access vlan <id>    Assign the port to a VLAN"), out("  exit / end             Leave this mode")], ok: true, ctx: keep() };
      }
      return { lines: [out(`% Invalid input detected at '^' marker.`, { status: "error" }), out(`Type '?' or 'help' for interface configuration commands.`)], ok: false, ctx: keep(), reason: "Invalid interface config command." };
    }

    // ------------------------------------------------------- vlan config mode
    case "vlan": {
      const c = normalized(cmd);
      const vid = ctx.vlanId ?? 1;
      if (c === "name") {
        const d = cloneDevice(device);
        d.vlans = [...(d.vlans ?? [])];
        const v = d.vlans.find((x) => x.id === vid);
        if (v) v.name = argStr || `VLAN${vid}`;
        return { lines: [out(`% VLAN ${vid} renamed to "${argStr}"`, { delay: 100 })], ok: true, device: d, ctx: keep() };
      }
      if (c === "exit") return { lines: [out("")], ok: true, ctx: next({ mode: "global" }) };
      if (c === "end") return { lines: [out("%SYS-5-CONFIG_I: Configured from console by console")], ok: true, ctx: next({ mode: "privileged" }) };
      if (c === "?" || c === "help") {
        return { lines: [out(`VLAN ${vid} configuration commands:`), out("  name <name>            Set the VLAN name"), out("  exit                   Return to global configuration"), out("  end                    Return to privileged mode")], ok: true, ctx: keep() };
      }
      return { lines: [out(`% Invalid input detected at '^' marker.`, { status: "error" })], ok: false, ctx: keep(), reason: "Invalid VLAN config command." };
    }
  }
}

/** IOS `show …` — every line is computed from the live engine state. */
function iosShow(snap: NetSnapshot, device: Device, sub: string): CommandResult {
  const lines: CmdLine[] = [];
  const mac = macIos(device.config.mac);
  const host = label(device);
  const labelOf = (i: Device["config"]["interfaces"][number]) => i.label ?? i.id;

  const fail = (msg: string) => ({ lines: [out(msg, { status: "error" })], ok: false, reason: msg });

  if (!sub) {
    return { lines: [out("Show commands:"), out("  show version"), out("  show ip interface brief"), out("  show ip route"), out("  show running-config / startup-config"), out("  show vlan brief"), out("  show mac address-table"), out("  show arp"), out("  show interfaces / interface <name>"), out("  show history")], ok: true };
  }

  if (sub === "version") {
    lines.push(out(IOS_BANNER));
    lines.push(out(`Hostname: ${host}  ·  MAC: ${mac}`), out(`Powered: ${device.poweredOn === false ? "OFF" : "ON"}  ·  uptime is 0 minutes`));
    return { lines, ok: true };
  }

  if (sub === "ip interface brief" || sub === "ip int brief" || sub === "ip") {
    lines.push(out("Interface              IP-Address      OK? Method Status Protocol"));
    for (const i of device.config.interfaces) {
      if (i.kind === "console") continue;
      const link = linkState(snap, device, i);
      lines.push(out(`${labelOf(i).padEnd(22)} ${(i.ip ?? "unassigned").padEnd(15)} YES NVRAM  ${i.status.padEnd(6)} ${link}`));
    }
    return { lines, ok: true };
  }

  if (sub === "ip route" || sub === "ip route static" || sub === "ip route connected") {
    lines.push(out("Codes: C - connected, S - static, * - default route"));
    for (const i of device.config.interfaces) {
      if (i.ip && i.status === "up") {
        const net = networkOf(parseIp(i.ip)!, i.mask ?? "255.255.255.0");
        lines.push(out(`C    ${formatIp(net)}/${maskToBits(i.mask ?? "255.255.255.0")} is directly connected, ${labelOf(i)}`));
      }
    }
    if (device.routes.length === 0) lines.push(out("S    (no static routes)"));
    for (const r of device.routes) {
      const star = r.network === "0.0.0.0" ? "*" : "";
      lines.push(out(`S${star}   ${r.network}/${maskToBits(r.mask)} [1/0] via ${r.nextHop === "0.0.0.0" ? "(default)" : r.nextHop}`));
    }
    return { lines, ok: true };
  }

  if (sub === "running-config" || sub === "run") {
    lines.push(out("Building configuration...", { delay: 180 }));
    lines.push(out("Current configuration :", { status: "ok" }));
    lines.push(...iosConfigLines(device));
    return { lines, ok: true };
  }

  if (sub === "startup-config") {
    const saved = snap.startupConfigs?.[device.id];
    if (!saved) {
      lines.push(out("Startup configuration not found. Use 'write memory' (or saveconfig) to save it.", { status: "warn" }));
      return { lines, ok: true };
    }
    lines.push(out("Building configuration...", { delay: 180 }));
    lines.push(out("Startup configuration :", { status: "ok" }));
    lines.push(
      ...iosConfigLines({
        ...device,
        config: { ...device.config, hostname: saved.hostname, interfaces: saved.interfaces },
        routes: saved.routes,
      })
    );
    return { lines, ok: true };
  }

  if (sub === "vlan brief" || sub === "vlan") {
    const vlans = device.vlans?.length ? device.vlans : [{ id: 1, name: "default" }];
    lines.push(out("VLAN Name                             Status    Ports"));
    lines.push(out("---- -------------------------------- --------- -------------------------------"));
    const portsByVlan = new Map<number, string[]>();
    for (const i of device.config.interfaces) {
      if (i.kind === "console" || i.kind === "serial") continue;
      if (i.trunk) continue;
      const v = i.accessVlan ?? 1;
      portsByVlan.set(v, [...(portsByVlan.get(v) ?? []), labelOf(i)]);
    }
    for (const v of vlans) {
      const ports = (portsByVlan.get(v.id) ?? []).join(", ");
      lines.push(out(`${String(v.id).padEnd(5)} ${v.name.padEnd(32)} active    ${ports}`));
    }
    return { lines, ok: true };
  }

  if (sub === "mac address-table" || sub === "mac-address-table" || sub === "mac address-table dynamic") {
    const table = snap.macTables[device.id] ?? {};
    lines.push(out(`Mac Address Table — ${host}`));
    lines.push(out("-------------------------------------------"));
    lines.push(out("Vlan    Mac Address       Type        Ports"));
    lines.push(out("----    -----------       --------    -----"));
    const entries = Object.entries(table);
    if (entries.length === 0) lines.push(out("  (table is empty — traffic has not flowed yet)"));
    for (const [m, port] of entries) {
      const v = portVlan(device, port);
      lines.push(out(` ${String(v).padEnd(7)} ${macIos(m).padEnd(17)} DYNAMIC    ${labelOf(device.config.interfaces.find((x) => x.id === port)!)}`));
    }
    return { lines, ok: true };
  }

  if (sub === "arp") {
    const entries = arpCache(snap, device.id);
    lines.push(out(`Address                  HWtype  HWaddress         Interface`));
    for (const e of entries) lines.push(out(` ${e.ip.padEnd(21)} ether   ${macIos(e.mac)}  ${labelOf(device.config.interfaces.find((x) => x.id === e.port) ?? device.config.interfaces[0])}`));
    if (entries.length === 0) lines.push(out("  (no ARP entries — nothing has been resolved yet)"));
    return { lines, ok: true };
  }

  if (sub === "interfaces" || sub.startsWith("interface ") || sub === "int") {
    if (sub === "interfaces" || sub === "int") {
      for (const i of device.config.interfaces) {
        if (i.kind === "console") continue;
        lines.push(...iosInterfaceBlock(snap, device, i));
      }
      return { lines, ok: true };
    }
    const name = sub.replace(/^interface\s+/, "");
    const iface = findIface(device, name);
    if (!iface) return fail(`% Interface ${name} does not exist`);
    lines.push(...iosInterfaceBlock(snap, device, iface));
    return { lines, ok: true };
  }

  if (sub === "history") {
    const hist = device.cli?.commands ?? [];
    lines.push(out("Command History:"));
    if (hist.length === 0) lines.push(out("  (no commands recorded yet)"));
    hist.forEach((c, i) => lines.push(out(`  ${String(i + 1).padStart(3)}  ${c}`)));
    return { lines, ok: true };
  }

  return fail("Available: show version · show ip interface brief · show ip route · show running-config · show startup-config · show vlan brief · show mac address-table · show arp · show interfaces · show history");
}

function iosInterfaceBlock(snap: NetSnapshot, device: Device, i: Device["config"]["interfaces"][number]): CmdLine[] {
  const labelOf = i.label ?? i.id;
  const link = linkState(snap, device, i);
  const mac = macIos(device.config.mac);
  const lines: CmdLine[] = [];
  lines.push(out(`${labelOf} is ${i.status === "up" ? "up" : "administratively down"}, line protocol is ${link === "up" ? "up" : link === "no-cable" ? "down (no cable)" : "down"}`));
  lines.push(out(`  Hardware is NSIM-L3, address is ${mac} (bia ${mac})`));
  if (i.ip) lines.push(out(`  Internet address is ${i.ip}/${maskToBits(i.mask ?? "255.255.255.0")}`));
  if (i.description) lines.push(out(`  Description: ${i.description}`));
  if (device.type === "switch") {
    if (i.trunk) lines.push(out(`  Mode: TRUNK (carries all VLANs)`));
    else lines.push(out(`  Access VLAN: ${i.accessVlan ?? 1}`));
  }
  lines.push(out(""));
  return lines;
}

/** IOS rendering of a device's running configuration (also used for startup). */
function iosConfigLines(device: Device): CmdLine[] {
  const lines: CmdLine[] = [];
  const push = (t: string) => lines.push(out(t));
  push(`!`);
  push(`hostname ${device.config.hostname}`);
  push(`!`);
  for (const v of device.vlans?.length ? device.vlans : [{ id: 1, name: "default" }]) {
    push(`vlan ${v.id}`);
    push(` name ${v.name}`);
  }
  push(`!`);
  for (const i of device.config.interfaces) {
    push(`interface ${i.label ?? i.id}`);
    if (i.ip) push(` ip address ${i.ip} ${i.mask ?? "255.255.255.0"}`);
    if (i.description) push(` description ${i.description}`);
    if (device.type === "switch") {
      if (i.trunk) push(` switchport mode trunk`);
      else push(` switchport mode access`);
      if (i.accessVlan !== undefined && i.accessVlan !== 1) push(` switchport access vlan ${i.accessVlan}`);
    }
    push(` ${i.status === "up" ? "no" : ""} shutdown`);
  }
  push(`!`);
  for (const r of device.routes) {
    push(`ip route ${r.network} ${r.mask} ${r.nextHop === "0.0.0.0" ? "0.0.0.0" : r.nextHop}`);
  }
  push(`!`);
  push(`end`);
  return lines;
}

// ---------------------------------------------------------------------------
// Entry point — dispatches between the Windows interpreter (end devices) and
// the Cisco IOS interpreter (routers/switches/firewalls). Devices with a `cli`
// run IOS; everything else keeps the classic Windows CMD prompt.
// ---------------------------------------------------------------------------

export function runCommand(snap: NetSnapshot, deviceId: string, input: string, ctx?: CliContext): CommandResult {
  const device = snap.devices.find((d) => d.id === deviceId);
  if (!device) {
    return { lines: [out(`'${input}' is not recognized as an internal or external command.`, { status: "error" })], ok: false, reason: "Device not found." };
  }
  if (DEVICE_TYPES[device.type].cli) {
    // No explicit context (tests, old callers) means the router is already in
    // privileged mode — keeps `saveconfig`/`show running-config`/`reload` working.
    return runIosCommand(snap, device, input, ctx ?? { mode: "privileged" });
  }
  return runWindowsCommand(snap, device, input);
}

function runWindowsCommand(snap: NetSnapshot, device: Device, input: string): CommandResult {
  const tokens = input.trim().split(/\s+/);
  const cmd = tokens[0]?.toLowerCase() ?? "";
  const arg = tokens.slice(1).join(" ");

  switch (cmd) {
    case "ping":
      if (!arg) return err("Usage: ping <host-or-ip>", false);
      return pingCommand(snap, device.id, arg);

    case "tracert":
    case "traceroute":
      if (!arg) return err("Usage: tracert <host-or-ip>", false);
      return tracertCommand(snap, device.id, arg);

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

    case "saveconfig":
    case "save":
      return saveConfigCommand(device);

    case "reload":
      return reloadCommand(snap, device);

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
    out("RELOAD             Reboots the device, loading its saved startup configuration"),
    out("SAVECONFIG         Saves the running configuration as the startup configuration"),
    out("SHOW               Show interfaces / ip / routes / services / version / running-config / startup-config"),
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
  const device = snap.devices.find((d) => d.id === deviceId);
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

  if (device && DEVICE_TYPES[device.type].cli) {
    const ios: { cmd: string; explain: string }[] = [
      { cmd: "enable", explain: "Enter privileged exec mode." },
      { cmd: "configure terminal", explain: "Enter global configuration mode." },
      { cmd: `interface GigabitEthernet0/0`, explain: "Enter interface configuration mode." },
      { cmd: `ip route ${pingFirst} 255.255.255.0 <next-hop>`, explain: "Add a static route to a remote network." },
      { cmd: "show ip interface brief", explain: "List interfaces with IPs and status." },
      { cmd: "show ip route", explain: "Show the routing table (connected + static routes)." },
      { cmd: "show running-config", explain: "Show the live (running) configuration." },
      { cmd: "show vlan brief", explain: "Show configured VLANs and assigned ports." },
      { cmd: "show mac address-table", explain: "Show the learned MAC address table." },
      { cmd: `ping ${pingFirst}`, explain: "Send ICMP echo requests to a device and measure replies." },
      { cmd: `traceroute ${tracertTargets[0] ?? pingFirst}`, explain: "Show the layer-3 hops a packet takes to reach the destination." },
      { cmd: "write memory", explain: "Save the running configuration as the startup configuration." },
      { cmd: "do", explain: "Run a privileged command without leaving configuration mode." },
      { cmd: "disable", explain: "Leave privileged mode and return to user exec." },
      { cmd: "exit", explain: "Leave the current mode or close the session." },
      { cmd: "?", explain: "List commands available in this mode." },
    ];
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return ios.slice(0, 7);
    return ios
      .filter((s) => s.cmd.toLowerCase().startsWith(trimmed) || s.cmd.toLowerCase().includes(trimmed))
      .slice(0, 7);
  }

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
    { cmd: "show running-config", explain: "Show the live (running) configuration of this device." },
    { cmd: "show startup-config", explain: "Show the saved startup configuration of this device." },
    { cmd: "saveconfig", explain: "Save the running configuration as the startup configuration." },
    { cmd: "reload", explain: "Reboot the device and restore its saved startup configuration." },
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
