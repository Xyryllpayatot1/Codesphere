// IPv4 helpers used by the engine and the CLI — pure, no I/O.

export type Ip = {
  a: number;
  b: number;
  c: number;
  d: number;
};

export function parseIp(s: string): Ip | null {
  const parts = s.trim().split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  const [a, b, c, d] = nums;
  return { a, b, c, d };
}

export function formatIp(ip: Ip): string {
  return `${ip.a}.${ip.b}.${ip.c}.${ip.d}`;
}

export function ipToInt(ip: Ip): number {
  return ((ip.a * 256 + ip.b) * 256 + ip.c) * 256 + ip.d;
}

export function intToIp(n: number): Ip {
  const d = n % 256;
  const rest1 = Math.floor(n / 256);
  const c = rest1 % 256;
  const rest2 = Math.floor(rest1 / 256);
  const b = rest2 % 256;
  const a = Math.floor(rest2 / 256);
  return { a, b, c, d };
}

export function maskToBits(mask: string): number {
  const ip = parseIp(mask);
  if (!ip) return 24;
  let bits = 0;
  const arr = [ip.a, ip.b, ip.c, ip.d];
  for (const octet of arr) {
    const v = octet;
    for (let i = 7; i >= 0; i--) {
      if ((v >> i) & 1) bits++;
    }
  }
  return bits;
}

export function bitsToMask(bits: number): string {
  let n = 0;
  for (let i = 31; i > 31 - bits && i >= 0; i--) n |= 1 << i;
  return intToIp(n >>> 0).toString().replace(",", ".");
}

export function networkOf(ip: Ip, mask: string): Ip {
  const m = parseIp(mask)!;
  return {
    a: ip.a & m.a,
    b: ip.b & m.b,
    c: ip.c & m.c,
    d: ip.d & m.d,
  };
}

export function isSameNetwork(ipA: Ip, maskA: string, ipB: Ip, maskB: string): boolean {
  const a = networkOf(ipA, maskA);
  const b = networkOf(ipB, maskB);
  return a.a === b.a && a.b === b.b && a.c === b.c && a.d === b.d;
}

/** The IPv4-mapped broadcast address for a network+mask. */
export function broadcastOf(ip: Ip, mask: string): Ip {
  const m = parseIp(mask)!;
  const net = networkOf(ip, mask);
  const inv = { a: 255 - m.a, b: 255 - m.b, c: 255 - m.c, d: 255 - m.d };
  return {
    a: net.a | inv.a,
    b: net.b | inv.b,
    c: net.c | inv.c,
    d: net.d | inv.d,
  };
}

export function ipInRange(ip: Ip, network: Ip, mask: string): boolean {
  const net = networkOf(ip, mask);
  return net.a === network.a && net.b === network.b && net.c === network.c && net.d === network.d;
}

export function ipBetween(ip: Ip, start: Ip, end: Ip): boolean {
  const n = ipToInt(ip);
  return n >= ipToInt(start) && n <= ipToInt(end);
}

/** Random MAC address (locally administered, unicast). */
export function randomMac(): string {
  const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  return `02:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}

/** True when the address is a valid unicast host address for network+mask. */
export function isUsableHost(ip: Ip, network: Ip, mask: string): { ok: boolean; reason?: string } {
  const net = networkOf(ip, mask);
  if (net.a !== network.a || net.b !== network.b || net.c !== network.c || net.d !== network.d) {
    return { ok: false, reason: "Not in the subnet range of the interface network." };
  }
  const bits = maskToBits(mask);
  if (bits >= 31) return { ok: false, reason: "The subnet mask leaves no room for hosts." };
  const bc = broadcastOf(ip, mask);
  if (ip.a === bc.a && ip.b === bc.b && ip.c === bc.c && ip.d === bc.d) {
    return { ok: false, reason: "That is the broadcast address for this network." };
  }
  const base = networkOf(ip, mask);
  if (ip.a === base.a && ip.b === base.b && ip.c === base.c && ip.d === base.d) {
    return { ok: false, reason: "That is the network address for this network." };
  }
  return { ok: true };
}

export function describeNetwork(network: Ip, mask: string): string {
  const bits = maskToBits(mask);
  return `${formatIp(network)}/${bits}`;
}
