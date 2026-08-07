// ---------------------------------------------------------------------------
// Server services — the "daemons" a server/cloud can run. Every service is
// wired into the engine: turning one off changes how the simulator answers
// (DNS lookups, DHCP leases, HTTP requests, …). Pure metadata + defaults.
// ---------------------------------------------------------------------------

import type { ServerServiceKey, ServerServices } from "./types";
import { SERVER_SERVICE_KEYS } from "./types";

export type ServiceDef = {
  key: ServerServiceKey;
  label: string;
  port: number;
  protocol: "TCP" | "UDP";
  description: string;
  /** What breaks in the simulation when this service is off. */
  impact: string;
};

export const SERVICE_DEFS: Record<ServerServiceKey, ServiceDef> = {
  http: {
    key: "http",
    label: "HTTP Web Server",
    port: 80,
    protocol: "TCP",
    description: "Serves web pages over port 80. The browser talks to this.",
    impact: "Turning HTTP off makes browsers fail with 'Connection refused'.",
  },
  https: {
    key: "https",
    label: "HTTPS Web Server",
    port: 443,
    protocol: "TCP",
    description: "Encrypted web traffic over port 443 (TLS on top of HTTP).",
    impact: "Turning HTTPS off blocks secure browsing with 'Connection refused'.",
  },
  dns: {
    key: "dns",
    label: "DNS Resolver",
    port: 53,
    protocol: "UDP",
    description: "Translates hostnames into IP addresses on port 53.",
    impact: "Turning DNS off makes every hostname lookup fail.",
  },
  dhcp: {
    key: "dhcp",
    label: "DHCP Server",
    port: 67,
    protocol: "UDP",
    description: "Hands out IP leases to devices on the same segment (port 67).",
    impact: "Turning DHCP off means no device can renew or get a new address.",
  },
  ftp: {
    key: "ftp",
    label: "FTP File Transfer",
    port: 21,
    protocol: "TCP",
    description: "Classic file transfer protocol (port 21 for control).",
    impact: "Turning FTP off makes file transfers fail with 'Connection refused'.",
  },
  smtp: {
    key: "smtp",
    label: "SMTP Mail",
    port: 25,
    protocol: "TCP",
    description: "Sends email between mail servers (port 25).",
    impact: "Turning SMTP off stops outbound mail.",
  },
  pop3: {
    key: "pop3",
    label: "POP3 Mail",
    port: 110,
    protocol: "TCP",
    description: "Downloads mail to a client (port 110).",
    impact: "Turning POP3 off stops clients from reading mail.",
  },
  ssh: {
    key: "ssh",
    label: "SSH Remote Shell",
    port: 22,
    protocol: "TCP",
    description: "Secure command-line access (port 22).",
    impact: "Turning SSH off refuses remote management connections.",
  },
  fileServer: {
    key: "fileServer",
    label: "File Server",
    port: 445,
    protocol: "TCP",
    description: "Shares files and folders on the network (SMB, port 445).",
    impact: "Turning the file server off hides all shared folders.",
  },
  database: {
    key: "database",
    label: "Database",
    port: 3306,
    protocol: "TCP",
    description: "Hosts a database service for applications (port 3306).",
    impact: "Turning the database off makes apps that depend on it fail.",
  },
};

export const SERVICE_LIST: ServiceDef[] = SERVER_SERVICE_KEYS.map((k) => SERVICE_DEFS[k]);

/** Every service enabled by default. */
export function defaultServices(): ServerServices {
  const out = {} as ServerServices;
  for (const k of SERVER_SERVICE_KEYS) out[k] = true;
  return out;
}

export function serviceOn(d: { services?: ServerServices; type: string }, key: ServerServiceKey): boolean {
  if (d.type !== "server" && d.type !== "cloud") return true;
  if (!d.services) return true;
  return d.services[key] !== false;
}

/** Human-readable "what is this server running" line for live status. */
export function serviceSummary(d: { services?: ServerServices }): string {
  if (!d.services) return "all services";
  const on = SERVER_SERVICE_KEYS.filter((k) => d.services![k] !== false);
  if (on.length === 0) return "no services running";
  return on.map((k) => SERVICE_DEFS[k].label.split(" ")[0]).join(", ");
}
