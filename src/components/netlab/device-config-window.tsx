"use client";

import { useEffect, useRef, useState } from "react";
import { X, Terminal, Trash2, Plus, Wifi, Info, Activity, Users, ShieldAlert, LayoutGrid, Power } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { useIsMobile } from "@/lib/mobile";
import { DeviceIcon, deviceColor } from "./device-icon";
import { DEVICE_TYPES } from "@/lib/net/devices";
import { deviceTip } from "@/lib/net/explain";
import { SERVICE_DEFS, serviceOn } from "@/lib/net/services";
import { SERVER_SERVICE_KEYS } from "@/lib/net/types";
import type { Device, DeviceType, InterfaceConfig, PortKind } from "@/lib/net/types";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CliTerminal } from "./cli-terminal";

export const KIND_BADGE: Record<PortKind, string> = {
  ethernet: "bg-amber-500/15 text-amber-500",
  fiber: "bg-sky-500/15 text-sky-500",
  serial: "bg-violet-500/15 text-violet-500",
  wireless: "bg-cyan-500/15 text-cyan-500",
  console: "bg-emerald-500/15 text-emerald-500",
};

export function CommitInput({
  value,
  onCommit,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <input
      key={value}
      defaultValue={value}
      disabled={disabled}
      placeholder={placeholder}
      onBlur={(e) => {
        const v = e.target.value;
        if (v !== value) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      }}
      className={cn(
        "h-7 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50",
        className
      )}
    />
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

type TabId = "general" | "network" | "wireless" | "services" | "routes" | "ports" | "cli" | "stats" | "clients" | "logs" | "cmd";

const TABS: Record<DeviceType, { id: TabId; label: string; icon: React.ReactNode }[]> = {
  pc: [
    { id: "general", label: "General", icon: <Info className="h-3.5 w-3.5" /> },
    { id: "network", label: "Network", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "cmd", label: "Command Prompt", icon: <Terminal className="h-3.5 w-3.5" /> },
  ],
  laptop: [
    { id: "general", label: "General", icon: <Info className="h-3.5 w-3.5" /> },
    { id: "network", label: "Network", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "wireless", label: "Wi-Fi", icon: <Wifi className="h-3.5 w-3.5" /> },
    { id: "cmd", label: "Command Prompt", icon: <Terminal className="h-3.5 w-3.5" /> },
  ],
  server: [
    { id: "general", label: "General", icon: <Info className="h-3.5 w-3.5" /> },
    { id: "network", label: "Network", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "services", label: "Services", icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "cmd", label: "Command Prompt", icon: <Terminal className="h-3.5 w-3.5" /> },
  ],
  printer: [
    { id: "general", label: "General", icon: <Info className="h-3.5 w-3.5" /> },
    { id: "network", label: "Network", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  ],
  switch: [
    { id: "ports", label: "Ports", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "stats", label: "Statistics", icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "cli", label: "Command Prompt", icon: <Terminal className="h-3.5 w-3.5" /> },
  ],
  hub: [
    { id: "ports", label: "Ports", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "stats", label: "Statistics", icon: <Activity className="h-3.5 w-3.5" /> },
  ],
  router: [
    { id: "network", label: "Interfaces", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "routes", label: "Routing", icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "cli", label: "Command Prompt", icon: <Terminal className="h-3.5 w-3.5" /> },
  ],
  wirelessRouter: [
    { id: "network", label: "Interfaces", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "wireless", label: "Wi-Fi", icon: <Wifi className="h-3.5 w-3.5" /> },
    { id: "routes", label: "Routing", icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "cli", label: "Command Prompt", icon: <Terminal className="h-3.5 w-3.5" /> },
  ],
  accessPoint: [
    { id: "wireless", label: "Wi-Fi", icon: <Wifi className="h-3.5 w-3.5" /> },
    { id: "clients", label: "Clients", icon: <Users className="h-3.5 w-3.5" /> },
    { id: "network", label: "Network", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  ],
  firewall: [
    { id: "network", label: "Interfaces", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "logs", label: "Logs", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    { id: "cli", label: "Command Prompt", icon: <Terminal className="h-3.5 w-3.5" /> },
  ],
  cloud: [
    { id: "general", label: "General", icon: <Info className="h-3.5 w-3.5" /> },
    { id: "network", label: "Network", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "services", label: "Services", icon: <Activity className="h-3.5 w-3.5" /> },
  ],
};

export function DeviceConfigWindow() {
  const { configDeviceId, closeConfig, sim } = useNetlab();
  const device = sim.devices.find((d) => d.id === configDeviceId) ?? null;

  if (!device) return null;
  return <ConfigWindow device={device} onClose={closeConfig} />;
}

function ConfigWindow({ device, onClose }: { device: Device; onClose: () => void }) {
  const { configTab, setConfigTab, setHostname, togglePower } = useNetlab();
  const def = DEVICE_TYPES[device.type];
  const tabs = TABS[device.type];
  const off = device.poweredOn === false;
  const mobile = useIsMobile();
  const [pos, setPos] = useState({ x: typeof window !== "undefined" ? Math.max(24, window.innerWidth - 460 - 24) : 24, y: 72 });
  const [size, setSize] = useState({ width: 430, height: 540 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const onTitleDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onTitleMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPos({ x: d.origX + (e.clientX - d.startX), y: Math.max(8, d.origY + (e.clientY - d.startY)) });
  };
  const onTitleUp = () => (dragRef.current = null);

  const onResizeDown = (e: React.PointerEvent) => {
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.width, origH: size.height };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    const d = resizeRef.current;
    if (!d) return;
    setSize({ width: Math.min(760, Math.max(360, d.origW + (e.clientX - d.startX))), height: Math.min(760, Math.max(420, d.origH + (e.clientY - d.startY))) });
  };
  const onResizeUp = () => (resizeRef.current = null);

  const hasCli = def.cli || device.type === "pc" || device.type === "laptop" || device.type === "server" || device.type === "printer";

  useEffect(() => {
    if (!tabs.some((t) => t.id === configTab)) setConfigTab(tabs[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.id]);

  return (
    <div className="fixed inset-0 z-40" onPointerDown={onClose}>
      <div
        className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        style={
          mobile
            ? { left: 0, top: 0, width: "100%", height: "100%", borderRadius: 0, border: "none" }
            : { left: pos.x, top: pos.y, width: size.width, height: size.height }
        }
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* title bar */}
        <div
          className={cn("flex items-center gap-2 border-b border-border bg-secondary/60 px-3 py-2", !mobile && "cursor-move")}
          onPointerDown={mobile ? undefined : onTitleDown}
          onPointerMove={mobile ? undefined : onTitleMove}
          onPointerUp={mobile ? undefined : onTitleUp}
        >
          <DeviceIcon type={device.type} className={cn("h-6 w-6", deviceColor(device.type))} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{device.config.hostname}</p>
            <p className="text-[10px] text-muted-foreground">{def.label}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setConfigTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition",
                configTab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
          {configTab === "general" && (
            <div className="space-y-3">
              <Section title="Device name">
                <CommitInput value={device.config.hostname} onCommit={(v) => setHostname(device.id, v)} className="h-8 text-sm font-semibold" />
              </Section>
              <Section title="Power">
                <div className={cn("flex items-center justify-between rounded-lg border p-2.5", off ? "border-destructive/30 bg-destructive/5" : "border-border bg-background/60")}>
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", off ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success")}>
                      <Power className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium">{off ? "Powered off" : "Powered on"}</p>
                      <p className="text-[10px] text-muted-foreground">{off ? "Cannot send, receive or forward traffic." : "Device is active on the network."}</p>
                    </div>
                  </div>
                  <Switch checked={!off} onCheckedChange={() => togglePower(device.id)} label="Power" />
                </div>
              </Section>
              <Section title="About this device">
                <p className="text-xs leading-relaxed text-muted-foreground">{def.description}</p>
              </Section>
              <Section title="MAC address">
                <p className="rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-xs">{device.config.mac}</p>
              </Section>
              <p className="border-t border-border pt-3 text-[11px] leading-snug text-muted-foreground">{deviceTip(device.type)}</p>
            </div>
          )}

          {configTab === "network" && <NetworkTab device={device} />}
          {configTab === "wireless" && <WlanSettings device={device} />}
          {configTab === "services" && <ServerSettings device={device} />}
          {configTab === "routes" && <RouteSettings device={device} />}

          {configTab === "ports" && (
            <div className="space-y-2">
              <Section title={`Ports (${device.config.interfaces.length})`}>
                <div className="space-y-1.5">
                  {device.config.interfaces.map((iface) => (
                    <InterfaceRow key={iface.id} device={device} iface={iface} showIp={false} />
                  ))}
                </div>
              </Section>
              {device.type === "switch" && <MacTable device={device} />}
              <p className="text-[11px] text-muted-foreground">A switch learns which MAC address lives on each port. Double-click a device to reconnect cables.</p>
            </div>
          )}

          {configTab === "stats" && <StatsTab device={device} />}
          {configTab === "clients" && <ClientsTab device={device} />}
          {configTab === "logs" && <LogsTab device={device} />}
          {configTab === "cli" && hasCli && <CliTerminal deviceId={device.id} compact />}
          {configTab === "cmd" && <CliTerminal deviceId={device.id} compact />}
        </div>

        {/* resize handle */}
        {!mobile && (
          <div className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize" onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={onResizeUp}>
            <span className="absolute bottom-1 right-1 h-2 w-2 rounded-sm border-b-2 border-r-2 border-muted-foreground/50" />
          </div>
        )}
      </div>
    </div>
  );
}

function NetworkTab({ device }: { device: Device }) {
  return (
    <div className="space-y-3">
      <Section title="Network adapters">
        <div className="space-y-1.5">
          {device.config.interfaces.map((iface) => (
            <InterfaceRow key={iface.id} device={device} iface={iface} showIp={device.type !== "switch" && device.type !== "hub" && device.type !== "accessPoint" && device.type !== "cloud"} />
          ))}
        </div>
      </Section>
      {(DEVICE_TYPES[device.type].kind === "end" || device.type === "accessPoint") && <EndDeviceSettings device={device} />}
    </div>
  );
}

function InterfaceRow({ device, iface, showIp }: { device: Device; iface: InterfaceConfig; showIp: boolean }) {
  const { toggleInterface, setInterfaceIp } = useNetlab();
  const dhcp = device.config.dhcp;
  return (
    <div className="rounded-lg border border-border bg-background/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium">
          {iface.label ?? iface.id}
          {iface.wan && <span className="ml-1 text-[9px] uppercase text-cyan-500">WAN</span>}
        </span>
        <div className="flex items-center gap-2">
          <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase", KIND_BADGE[iface.kind])}>{iface.kind}</span>
          <button
            onClick={() => toggleInterface(device.id, iface.id)}
            title={iface.status === "up" ? "Interface up — click to disable" : "Interface down — click to enable"}
            className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold", iface.status === "up" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}
          >
            {iface.status === "up" ? "UP" : "DOWN"}
          </button>
        </div>
      </div>
      {showIp && (
        <div className="mt-1.5 grid grid-cols-[1fr_1fr] gap-1.5">
          <CommitInput value={iface.ip ?? ""} onCommit={(v) => setInterfaceIp(device.id, iface.id, v, iface.mask ?? "")} placeholder="IP address" disabled={dhcp} />
          <CommitInput value={iface.mask ?? ""} onCommit={(v) => setInterfaceIp(device.id, iface.id, iface.ip ?? "", v)} placeholder="Subnet mask" disabled={dhcp} />
        </div>
      )}
    </div>
  );
}

function EndDeviceSettings({ device }: { device: Device }) {
  const { setDhcp, setGateway, setDns, renewDhcp } = useNetlab();
  return (
    <Section title="IP mode">
      <div className="space-y-2">
        <label className="flex items-center justify-between text-xs">
          <span>Use DHCP (automatic)</span>
          <Switch checked={device.config.dhcp} onCheckedChange={(v) => setDhcp(device.id, v)} label="DHCP" />
        </label>
        {device.config.dhcp && (
          <button onClick={() => renewDhcp(device.id)} className="w-full rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20">
            Request address from DHCP server
          </button>
        )}
        <div className="space-y-1.5">
          <div>
            <p className="mb-0.5 text-[10px] text-muted-foreground">Default gateway</p>
            <CommitInput value={device.config.gateway ?? ""} onCommit={(v) => setGateway(device.id, v)} placeholder="e.g. 192.168.1.1" />
          </div>
          <div>
            <p className="mb-0.5 text-[10px] text-muted-foreground">DNS server</p>
            <CommitInput value={device.config.dns ?? ""} onCommit={(v) => setDns(device.id, v)} placeholder="e.g. 192.168.1.10" />
          </div>
        </div>
      </div>
    </Section>
  );
}

function ServerSettings({ device }: { device: Device }) {
  const { setDhcpPool, setDnsRecord, setServiceState } = useNetlab();
  const [recName, setRecName] = useState("");
  const [recIp, setRecIp] = useState("");
  const pool = device.dhcpPool;
  const isServer = device.type === "server";

  return (
    <>
      <Section title="Hosted services">
        <p className="-mt-1 text-[11px] leading-snug text-muted-foreground">
          Stop a service and its clients lose that feature — DHCP clients cannot lease, DNS lookups time out, web requests hang. Watch the live status in the CLI.
        </p>
        <div className="space-y-1.5">
          {SERVER_SERVICE_KEYS.map((k) => {
            const def = SERVICE_DEFS[k];
            const on = serviceOn(device, k);
            return (
              <div key={k} className={cn("flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2", on ? "border-border bg-background/60" : "border-destructive/30 bg-destructive/5")}>
                <div className="min-w-0">
                  <p className={cn("text-xs font-medium", !on && "text-muted-foreground line-through")}>{def.label}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {def.protocol} · port {def.port} {on ? "· RUNNING" : "· STOPPED"}
                  </p>
                </div>
                <Switch checked={on} onCheckedChange={(v) => setServiceState(device.id, k, v)} label={k} />
              </div>
            );
          })}
        </div>
      </Section>

      {isServer && (
        <>
          <Section title="DHCP server">
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <CommitInput value={pool?.start ?? ""} onCommit={(v) => setDhcpPool(device.id, v, pool?.end ?? "")} placeholder="Pool start" />
                <CommitInput value={pool?.end ?? ""} onCommit={(v) => setDhcpPool(device.id, pool?.start ?? "", v)} placeholder="Pool end" />
              </div>
              <p className="text-[10px] text-muted-foreground">e.g. 192.168.1.50 – 192.168.1.100</p>
            </div>
          </Section>
          <Section title="DNS records">
            <div className="space-y-1">
              {device.dnsRecords?.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/60 px-2 py-1">
                  <span className="min-w-0 truncate text-xs">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground">{r.ip || "unset"}</span>
                </div>
              ))}
              <div className="flex gap-1.5">
                <CommitInput value={recName} onCommit={(v) => setRecName(v)} placeholder="name" />
                <CommitInput value={recIp} onCommit={(v) => setRecIp(v)} placeholder="IP" />
                <button
                  onClick={() => {
                    if (recName && recIp) {
                      setDnsRecord(device.id, recName, recIp);
                      setRecName("");
                      setRecIp("");
                    }
                  }}
                  className="rounded-md bg-secondary px-2 py-1 text-xs"
                  title="Add DNS record"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Section>
        </>
      )}
    </>
  );
}

function RouteSettings({ device }: { device: Device }) {
  const { addRoute, removeRoute } = useNetlab();
  const [network, setNetwork] = useState("");
  const [mask, setMask] = useState("");
  const [nextHop, setNextHop] = useState("");
  const add = () => {
    if (!network || !nextHop) return;
    addRoute(device.id, network, mask || (network === "0.0.0.0" ? "0.0.0.0" : "255.255.255.0"), nextHop);
    setNetwork("");
    setMask("");
    setNextHop("");
  };
  return (
    <Section title="Static routes">
      <div className="space-y-1">
        {device.routes.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/60 px-2 py-1">
            <span className="min-w-0 truncate text-xs">
              {r.network}/{r.mask} → {r.nextHop}
            </span>
            <button onClick={() => removeRoute(device.id, r.id)} className="rounded p-0.5 text-muted-foreground hover:text-destructive" aria-label="Remove route">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="space-y-1.5 rounded-md border border-dashed border-border p-2">
          <CommitInput value={network} onCommit={(v) => setNetwork(v)} placeholder="Network (0.0.0.0 = default)" />
          <CommitInput value={mask} onCommit={(v) => setMask(v)} placeholder="Mask (default 255.255.255.0)" />
          <CommitInput value={nextHop} onCommit={(v) => setNextHop(v)} placeholder="Next-hop IP" />
          <button onClick={add} className="flex w-full items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Add route
          </button>
        </div>
      </div>
    </Section>
  );
}

function WlanSettings({ device }: { device: Device }) {
  const { setWlan } = useNetlab();
  const wlan = device.config.wlan ?? { ssid: "NetLab", enabled: false };
  return (
    <Section title="Wi-Fi">
      <div className="space-y-2">
        <label className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5" /> Wi-Fi enabled
          </span>
          <Switch checked={wlan.enabled} onCheckedChange={(v) => setWlan(device.id, { enabled: v })} label="Wi-Fi" />
        </label>
        {device.type === "laptop" ? (
          <div>
            <p className="mb-0.5 text-[10px] text-muted-foreground">Join network (SSID)</p>
            <CommitInput value={wlan.ssid} onCommit={(v) => setWlan(device.id, { ssid: v })} placeholder="SSID" />
            <p className="mt-1 text-[10px] text-muted-foreground">The laptop connects to any access point broadcasting this SSID.</p>
          </div>
        ) : (
          <div>
            <p className="mb-0.5 text-[10px] text-muted-foreground">Network name (SSID)</p>
            <CommitInput value={wlan.ssid} onCommit={(v) => setWlan(device.id, { ssid: v })} placeholder="SSID" />
            {device.type === "accessPoint" && <p className="mt-1 text-[10px] text-muted-foreground">Wireless clients with this SSID can join the network.</p>}
          </div>
        )}
      </div>
    </Section>
  );
}

function MacTable({ device }: { device: Device }) {
  const { sim } = useNetlab();
  const table = sim.macTables[device.id];
  const entries = table ? Object.entries(table) : [];
  return (
    <Section title="MAC address table">
      {entries.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No frames seen yet — the table fills up as devices start talking.</p>
      ) : (
        <div className="space-y-1">
          {entries.map(([mac, port]) => (
            <div key={mac} className="flex items-center justify-between rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-[10px]">
              <span>{mac}</span>
              <span className="text-muted-foreground">→ {port}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function StatsTab({ device }: { device: Device }) {
  const { sim } = useNetlab();
  const cables = sim.cables.filter((c) => c.fromDevice === device.id || c.toDevice === device.id);
  const table = device.type === "switch" ? sim.macTables[device.id] : undefined;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Ports" value={String(device.config.interfaces.length)} />
        <StatCard label="Links" value={String(cables.length)} />
        <StatCard label="MAC learned" value={table ? String(Object.keys(table).length) : "–"} />
      </div>
      {device.type === "switch" && <MacTable device={device} />}
      <p className="text-[11px] leading-snug text-muted-foreground">
        This {device.type === "hub" ? "hub repeats every frame out of all ports" : "switch forwards each frame to exactly one port using its MAC table"}.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-2 text-center">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function ClientsTab({ device }: { device: Device }) {
  const { sim } = useNetlab();
  const clients = sim.wirelessLinks.filter((w) => w.apId === device.id);
  return (
    <Section title="Connected clients">
      {clients.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No wireless clients connected yet. Turn on Wi-Fi on a laptop with the same SSID and it will join automatically.</p>
      ) : (
        <div className="space-y-1">
          {clients.map((c) => {
            const d = sim.devices.find((x) => x.id === c.deviceId);
            return (
              <div key={c.id} className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="text-xs font-medium">{d?.config.hostname ?? "device"}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{d?.config.interfaces.find((i) => i.ip)?.ip ?? "no IP"}</span>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function LogsTab({ device }: { device: Device }) {
  const up = device.config.interfaces.filter((i) => i.status === "up").length;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-slate-950 p-2 font-mono text-[11px] leading-relaxed text-slate-300">
        <p className="text-slate-500">{"// Firewall inspection log — live status"}</p>
        <p className="text-success">[ok] {up}/{device.config.interfaces.length} interfaces up</p>
        <p className="text-slate-400">[--] no traffic inspected yet</p>
        <p className="text-slate-400">[--] no policy violations</p>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        A firewall sits between your network and the internet. It inspects each packet and drops anything that does not match its rules — the first line of defense for a LAN.
      </p>
    </div>
  );
}
