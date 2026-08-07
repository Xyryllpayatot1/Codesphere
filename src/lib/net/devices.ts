import type { DeviceConfig, DeviceType, InterfaceConfig, PortKind } from "./types";

export type DeviceKind = "end" | "infra" | "router" | "security" | "cloud";

export type DeviceDef = {
  type: DeviceType;
  label: string;
  kind: DeviceKind;
  /** Whether the device supports a configurable CLI (router/switch/firewall). */
  cli: boolean;
  /** Whether the device has a layer-3 interface (can route / hold an IP). */
  routable: boolean;
  /** Which port media a default build exposes (end devices may also get wifi). */
  ports: PortKind[];
  /** A short hint for students. */
  help: string;
  /** Default hostname prefix used when a device is dropped. */
  prefix: string;
  /** One-line description shown in the palette and device panel. */
  description: string;
  /** How many ethernet ports a switch/hub defaults to. */
  portCount: number;
  canJoinWifi?: boolean;
};

export const DEVICE_TYPES: Record<DeviceType, DeviceDef> = {
  pc: {
    type: "pc",
    label: "PC",
    kind: "end",
    cli: false,
    routable: false,
    ports: ["ethernet", "console"],
    help: "A desktop computer. Plug it into a switch and configure its IP to join the network.",
    prefix: "PC",
    description: "Desktop computer (DHCP client)",
    portCount: 1,
  },
  laptop: {
    type: "laptop",
    label: "Laptop",
    kind: "end",
    cli: false,
    routable: false,
    ports: ["ethernet", "wireless", "console"],
    help: "A laptop can use Wi-Fi — click the laptop and choose an Access Point to connect.",
    prefix: "Laptop",
    description: "Laptop (Ethernet + Wi-Fi)",
    portCount: 1,
    canJoinWifi: true,
  },
  server: {
    type: "server",
    label: "Server",
    kind: "end",
    cli: false,
    routable: false,
    ports: ["ethernet", "fiber"],
    help: "Servers can host a DHCP pool and DNS records — perfect for labs.",
    prefix: "Server",
    description: "Server (DHCP + DNS services)",
    portCount: 1,
  },
  printer: {
    type: "printer",
    label: "Printer",
    kind: "end",
    cli: false,
    routable: false,
    ports: ["ethernet"],
    help: "A network printer gets its own IP address, just like a PC.",
    prefix: "Printer",
    description: "Network printer",
    portCount: 1,
  },
  switch: {
    type: "switch",
    label: "Switch",
    kind: "infra",
    cli: true,
    routable: false,
    ports: ["ethernet", "fiber", "console"],
    help: "Switches learn MAC addresses and forward frames only where they must go — connect all your PCs here.",
    prefix: "SW",
    description: "Layer-2 switch (MAC learning)",
    portCount: 8,
  },
  hub: {
    type: "hub",
    label: "Hub",
    kind: "infra",
    cli: false,
    routable: false,
    ports: ["ethernet"],
    help: "A hub is dumb — it repeats every frame to every port. Switches are smarter.",
    prefix: "Hub",
    description: "Legacy hub (broadcast to all)",
    portCount: 8,
  },
  router: {
    type: "router",
    label: "Router",
    kind: "router",
    cli: true,
    routable: true,
    ports: ["ethernet", "serial", "fiber", "console"],
    help: "Routers connect different networks. Configure each interface and add static routes to reach remote subnets.",
    prefix: "R",
    description: "Layer-3 router (routes between networks)",
    portCount: 4,
  },
  wirelessRouter: {
    type: "wirelessRouter",
    label: "Wi-Fi Router",
    kind: "router",
    cli: true,
    routable: true,
    ports: ["ethernet", "wireless"],
    help: "A home Wi-Fi router: one interface faces the ISP, the other serves your LAN and Wi-Fi clients.",
    prefix: "WR",
    description: "Wireless router (NAT + Wi-Fi)",
    portCount: 4,
    canJoinWifi: false,
  },
  accessPoint: {
    type: "accessPoint",
    label: "Access Point",
    kind: "infra",
    cli: false,
    routable: false,
    ports: ["ethernet", "wireless"],
    help: "An AP bridges Wi-Fi clients onto the wired network. Connect its Ethernet port to a switch.",
    prefix: "AP",
    description: "Wireless access point (Wi-Fi bridge)",
    portCount: 1,
  },
  firewall: {
    type: "firewall",
    label: "Firewall",
    kind: "security",
    cli: true,
    routable: true,
    ports: ["ethernet", "fiber", "console"],
    help: "Firewalls filter traffic between zones (your LAN and the outside world).",
    prefix: "FW",
    description: "Firewall (filters traffic between zones)",
    portCount: 2,
  },
  cloud: {
    type: "cloud",
    label: "Cloud",
    kind: "cloud",
    cli: false,
    routable: false,
    ports: ["ethernet", "fiber"],
    help: "The Internet. Ping and browse anything from here.",
    prefix: "Cloud",
    description: "The Internet (cloud)",
    portCount: 1,
  },
};

export function buildDefaultDeviceConfig(type: DeviceType, index: number): DeviceConfig {
  const def = DEVICE_TYPES[type];
  const ifaces: InterfaceConfig[] = [];

  if (type === "router") {
    const defs: { id: string; kind: PortKind; label: string }[] = [
      { id: "eth0", kind: "ethernet", label: "GigabitEthernet0/0" },
      { id: "eth1", kind: "ethernet", label: "GigabitEthernet0/1" },
      { id: "serial0", kind: "serial", label: "Serial0/0" },
      { id: "serial1", kind: "serial", label: "Serial0/1" },
    ];
    for (const d of defs) ifaces.push({ id: d.id, kind: d.kind, status: "up", label: d.label });
  } else if (type === "wirelessRouter") {
    const defs: { id: string; kind: PortKind; label: string; wan?: boolean }[] = [
      { id: "eth0", kind: "ethernet", label: "GigabitEthernet0/0 (WAN)", wan: true },
      { id: "eth1", kind: "ethernet", label: "GigabitEthernet0/1 (LAN)" },
      { id: "eth2", kind: "ethernet", label: "GigabitEthernet0/2 (LAN)" },
      { id: "eth3", kind: "ethernet", label: "GigabitEthernet0/3 (LAN)" },
    ];
    for (const d of defs) ifaces.push({ id: d.id, kind: d.kind, status: "up", label: d.label, wan: d.wan });
  } else {
    for (let i = 0; i < def.portCount; i++) {
      const portId = `eth${i}`;
      const labels: Partial<Record<DeviceType, string>> = {
        switch: `FastEthernet0/${i}`,
        firewall: i === 0 ? "GigabitEthernet0/0 (LAN)" : "GigabitEthernet0/1 (WAN)",
      };
      ifaces.push({
        id: portId,
        kind: def.ports[0] === "ethernet" ? "ethernet" : def.ports[0],
        status: "up",
        label: labels[type] ?? `${portId.toUpperCase()}`,
      });
    }
  }

  return {
    name: `${def.label} ${index + 1}`,
    hostname: `${def.prefix}${index + 1}`,
    mac: randomMacLight(type, index),
    dhcp: def.kind === "end",
    interfaces: ifaces,
  };
}

function randomMacLight(type: DeviceType, index: number): string {
  const vendor: Record<DeviceType, string> = {
    pc: "02:1A",
    laptop: "02:1B",
    server: "02:1C",
    printer: "02:1D",
    switch: "00:11",
    hub: "00:12",
    router: "00:13",
    wirelessRouter: "00:14",
    accessPoint: "00:15",
    firewall: "00:16",
    cloud: "00:99",
  };
  const prefix = vendor[type];
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `${prefix}:${hex(10 + index)}:${hex((index * 37) % 256)}:${hex((index * 91 + 7) % 256)}`;
}

/** All ports a device exposes for wiring (the ids used by cables). */
export function devicePorts(type: DeviceType): string[] {
  const def = DEVICE_TYPES[type];
  const ports: string[] = [];
  for (let i = 0; i < def.portCount; i++) ports.push(`eth${i}`);
  if (def.ports.includes("serial")) ports.push("serial0");
  return ports;
}
