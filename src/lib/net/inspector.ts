// ---------------------------------------------------------------------------
// Packet Inspector — turns any TraceStep into a clickable, teaching packet.
// The Ethernet/IP/transport headers and checksum are SIMULATED but deterministic
// and derived from the real trace (who sent it, where it is, what protocol).
// Every field carries a beginner-friendly explanation.
// ---------------------------------------------------------------------------

import type { Device, PacketType, PacketView, ProtocolName, TraceResult, TraceStep } from "./types";
import type { NetSnapshot } from "./packets";
import { deviceByIp } from "./packets";

const BROADCAST_MAC = "FF:FF:FF:FF:FF:FF";

const TYPE_INFO: Record<PacketType, { protocol: ProtocolName; ipProto: "ICMP" | "TCP" | "UDP"; dstPort: number; payload: (t: TraceResult, target: Device | null) => string }> = {
  icmp: { protocol: "ICMP", ipProto: "ICMP", dstPort: 0, payload: () => "PING echo reply/request — 32 bytes of payload" },
  http: { protocol: "HTTP", ipProto: "TCP", dstPort: 80, payload: (t, d) => (t.ok ? `HTTP/1.1 200 OK — served by ${d?.config.hostname ?? "server"}` : "HTTP/1.1 GET / — waiting for response") },
  dns: { protocol: "DNS", ipProto: "UDP", dstPort: 53, payload: (t) => (t.ok ? "DNS response — A record answer" : "DNS query — what is the address?") },
  dhcp: { protocol: "DHCP", ipProto: "UDP", dstPort: 67, payload: () => "DHCPDISCOVER → OFFER → REQUEST → ACK" },
  ftp: { protocol: "FTP", ipProto: "TCP", dstPort: 21, payload: () => "FTP — RETR/PUT file" },
};

const ARP_ACTIONS = new Set(["ARP request", "ARP reply", "MAC lookup", "Flood", "Delivered at L2"]);

function hash16(...parts: (string | number)[]): string {
  let h = 0x811c9dc5;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return "0x" + ((h & 0xffff) >>> 0).toString(16).padStart(4, "0");
}

function ttlAtStep(steps: TraceStep[], index: number): number {
  const ROUTE_ACTIONS = /Forward out|Static route|Default route|Send to gateway|Route found|route/;
  let hops = 0;
  for (let i = 0; i <= index; i++) {
    const s = steps[i];
    if (s.layer === "L3" && ROUTE_ACTIONS.test(s.action)) hops += 1;
  }
  return Math.max(1, 64 - hops);
}

export function packetView(snap: NetSnapshot, trace: TraceResult, stepIndex: number): PacketView {
  const step = trace.steps[stepIndex] ?? trace.steps[trace.steps.length - 1];
  const source = snap.devices.find((d) => d.id === trace.sourceId) ?? null;
  const srcIp = source?.config.interfaces.find((i) => i.ip)?.ip ?? "—";
  const srcMac = source?.config.mac ?? "—";

  const targetDevice = deviceByIp(snap.devices, trace.target)?.device ?? null;
  const dstIp = trace.target;
  const dstMac = targetDevice?.config.mac ?? BROADCAST_MAC;

  const type = (TYPE_INFO[trace.type] ?? TYPE_INFO.icmp) as (typeof TYPE_INFO)[keyof typeof TYPE_INFO];
  const isArp = ARP_ACTIONS.has(step.action);
  const ipLayer = step.layer === "L3" || step.layer === "L4" || step.layer === "L7";
  const l4Layer = step.layer === "L4" || step.layer === "L7";

  const etherType = isArp || step.action === "ARP request" || step.action === "ARP reply" ? "0x0806 (ARP)" : "0x0800 (IPv4)";
  const protoText = isArp ? "ARP" : type.ipProto;
  const ttl = ipLayer && !isArp ? ttlAtStep(trace.steps, stepIndex) : undefined;

  const ephemeral = 49152 + ((source?.config.mac.split("").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0) % 4000);
  const l4 =
    l4Layer && !isArp
      ? {
          protocol: protoText,
          srcPort: trace.ok ? type.dstPort : ephemeral,
          dstPort: trace.ok ? ephemeral : type.dstPort,
        }
      : undefined;

  const payloadText = isArp
    ? step.action === "ARP reply"
      ? `ARP reply — ${dstIp} is at ${targetDevice?.config.mac ?? "…"}`
      : `ARP request — who has ${dstIp}? Broadcast to every host on the segment`
    : type.payload(trace, targetDevice);

  const bytes = 14 + (ipLayer && !isArp ? 20 : 0) + (l4 ? (l4.protocol === "UDP" ? 8 : 20) : 0) + payloadText.length;

  const fields: PacketView["fields"] = [];
  fields.push({ name: "Frame", value: `${bytes} bytes total`, explain: "The whole packet as it crosses the wire — one unit of transmission." });
  fields.push({ name: "Ethernet: Source MAC", value: srcMac, explain: "The network card (NIC) address of the device that built this frame. Every NIC has a unique one." });
  fields.push({ name: "Ethernet: Destination MAC", value: dstMac, explain: "The NIC address the frame is being delivered to. Broadcast (all FF) means 'everyone on this segment'." });
  fields.push({ name: "EtherType", value: etherType, explain: "Tells the receiver what is inside the frame — ARP for address discovery, IPv4 for IP packets." });
  if (ipLayer && !isArp) {
    fields.push({ name: "IP: Source", value: srcIp, explain: "The IP address that sent the packet. This is what routers look at to route it." });
    fields.push({ name: "IP: Destination", value: dstIp, explain: "The IP address the packet is heading to. It never changes along the path." });
    fields.push({ name: "IP: TTL", value: String(ttl), explain: "Time To Live — decremented by every router so a packet cannot circle forever. At 0 the packet is dropped." });
    fields.push({ name: "IP: Protocol", value: protoText, explain: "Which transport protocol carries the data: ICMP (ping), TCP (reliable), or UDP (fast)." });
  }
  if (l4) {
    fields.push({
      name: `${l4.protocol}: ports`,
      value: `${l4.srcPort} → ${l4.dstPort}`,
      explain: "Ports tell the destination which application the data is for — web (80/443), DNS (53), DHCP (67), FTP (21).",
    });
  }
  fields.push({ name: "Payload", value: payloadText, explain: "The actual data being carried — the question asked or the answer given." });
  fields.push({ name: "Checksum (simulated)", value: hash16(srcMac, dstIp, protoText, step.action, stepIndex), explain: "A checksum verifies the header was not corrupted in transit. (Simulated for teaching.)" });

  return {
    protocol: isArp ? "ARP" : type.protocol,
    layer: step.layer,
    action: step.action,
    detail: step.detail,
    bytes,
    checksum: fields[fields.length - 1].value,
    ethernet: { srcMac, dstMac, etherType },
    ip: ipLayer && !isArp ? { srcIp, dstIp, ttl: ttl!, protocol: protoText } : undefined,
    l4,
    payload: payloadText,
    fields,
  };
}
