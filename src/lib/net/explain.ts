// ---------------------------------------------------------------------------
// Teaching tips — short explanations shown alongside packet traces, cable
// picks, devices and diagnostics. All strings, no logic.
// ---------------------------------------------------------------------------

import { DEVICE_TYPES } from "./devices";
import { CABLE_TYPES } from "./types";
import type { CableType, Device, TraceStep } from "./types";

export const LAYER_LABELS: Record<TraceStep["layer"], { title: string; blurb: string }> = {
  L1: { title: "Physical (L1)", blurb: "Bits travel along cables or radio waves. Nothing here knows about addresses yet." },
  L2: { title: "Data Link (L2)", blurb: "Frames move between neighbors using MAC addresses. Switches learn which MAC lives on which port." },
  L3: { title: "Network (L3)", blurb: "Packets are routed between networks using IP addresses. Routers decide the next hop." },
  L4: { title: "Transport (L4)", blurb: "Ports tell the destination which application the message is for (echo, web, DNS…)." },
  L7: { title: "Application (L7)", blurb: "The actual service — an HTTP request, a DNS question, a DHCP handshake." },
};

const ACTION_TIPS: Record<string, string> = {
  "Same subnet": "When the destination IP is inside the sender's own subnet, the packet goes straight to it — no router needed. The sender still needs the target's MAC address.",
  "Different subnet": "A packet for another network must be handed to the default gateway (a router). The sender knows this just by comparing subnet masks.",
  "Send to gateway": "The sender looks at its configured default gateway and addresses the frame to the gateway's MAC — not the final destination's.",
  "ARP request": "ARP asks 'who has this IP? Tell me your MAC address.' It is broadcast to every device on the segment.",
  "ARP reply": "The owner of that IP answers with its MAC address, and the sender caches the mapping so it does not ask again.",
  "MAC lookup": "A switch checks its MAC address table. If the destination MAC is known, it forwards to that one port; otherwise it floods.",
  "Delivered at L2": "The frame arrived at the right device — the NIC recognized its MAC address and accepted the frame.",
  Delivered: "The transport/application layer handled the message: an ICMP echo got a reply, an HTTP request got a response.",
  "Frame on cable": "The frame crosses the link to the next device. Cable type and link status decide whether it makes it.",
  "Static route": "A static route is a manually typed rule: 'to reach network X, go to next-hop Y'. It is how simple networks learn paths.",
  "Forward out eth0": "The router matched the destination against one of its connected networks, so it forwards out the interface that owns that subnet.",
  "No path": "There is no cable or wireless link that connects these two devices at layer 2 — something is disconnected or the link is down.",
  "No route": "The router does not know where the destination network lives. It needs a static route or a default route.",
  "Loop detected": "The router already saw this packet once. A routing loop (A→B→A) means the path is broken — check your routes.",
  "DNS lookup": "DNS translates a human name (www.example.com) into an IP address. The device asks the DNS server configured on it.",
  "DNS: no answer": "The DNS server has no record for that name. Check the spelling or add the record to the server.",
  "No IP address": "A device cannot send or receive IP traffic without an IP address. Use DHCP or set a static IP + subnet mask.",
  "DHCPDISCOVER": "DHCP starts with a broadcast: 'Is there a server that can give me an address?' Only servers on the same segment hear it.",
  "DHCPOFFER": "The DHCP server answers with a lease offer — a free address from its pool plus mask, gateway and DNS.",
  "DHCPREQUEST/ACK": "The client accepts the offer and the server confirms it. The device now has working layer-3 settings.",
  "Route found": "The router has a route entry (connected, static or default) that matches the destination network.",
  "Flood": "The switch does not know the destination MAC yet, so it sends the frame out of every port. The real recipient will answer, and the switch will learn.",
};

/** Teaching tip for a single trace step. */
export function explainStep(step: TraceStep): string {
  const direct = ACTION_TIPS[step.action];
  if (direct) return direct;
  if (step.layer in LAYER_LABELS) return LAYER_LABELS[step.layer].blurb;
  return step.detail;
}

/** Plain-language "what does this device do" for the palette and config panel. */
export function deviceTip(type: Device["type"]): string {
  const tips: Record<Device["type"], string> = {
    pc: "An end device. Sends and receives data; needs an IP, subnet mask and usually a gateway.",
    laptop: "An end device that can also join a wireless network (Wi-Fi) when an access point is in range.",
    server: "An end device that provides services (DHCP, DNS, files). It listens on well-known ports.",
    printer: "An end device. Receives print jobs from the network — a great 'reachable target' for ping tests.",
    switch: "Layer-2 hub of the LAN. Learns MAC addresses and forwards frames — never changes IP addresses.",
    hub: "Simplest shared medium: replays every frame to all ports. Slower and less secure than a switch.",
    router: "Layer-3 device. Connects different networks, chooses the next hop and forwards packets toward the destination.",
    wirelessRouter: "A home-style router: LAN and Wi-Fi share one subnet, and a WAN port connects out to the internet.",
    accessPoint: "Extends the LAN with Wi-Fi. Wireless clients associate with it and reach everything the switch can reach.",
    firewall: "Sits between your network and the internet, inspecting and filtering traffic before it passes.",
    cloud: "Represents the internet — a network of many routers you do not control. Reachable via default routes.",
  };
  return tips[type] ?? DEVICE_TYPES[type]?.label ?? type;
}

/** Teaching tip for a cable type. */
export function cableTip(type: CableType): string {
  return CABLE_TYPES[type]?.note ?? "";
}

/** Plain-language, beginner-friendly purpose for a cable type (connection chooser). */
export function cablePurpose(type: CableType): string {
  return CABLE_TYPES[type]?.purpose ?? "";
}

/** Human label for a device type ("PC", "Wireless Router", …). */
export function deviceLabel(type: Device["type"]): string {
  return DEVICE_TYPES[type]?.label ?? type;
}

export type TeachingNote = { title: string; body: string; kind: "success" | "error" | "info" };

/**
 * Guided-mode explanation shown after a connection is attempted.
 * Explains WHY a cable works (or why it does not) in plain language.
 */
export function connectionExplanation(from: Device, to: Device, cableType: CableType, ok: boolean, error?: string): TeachingNote {
  const fromName = from.config.hostname;
  const toName = to.config.hostname;
  const fromLabel = deviceLabel(from.type);
  const toLabel = deviceLabel(to.type);
  const sameKind = DEVICE_TYPES[from.type].kind === DEVICE_TYPES[to.type].kind;

  if (ok) {
    switch (cableType) {
      case "copperStraight":
        return {
          title: `${fromName} ↔ ${toName} connected`,
          body: `You joined a ${fromLabel} to a ${toLabel}. A straight-through cable connects two different device types — a host and a switch. Bits flow straight across the wire.`,
          kind: "success",
        };
      case "copperCrossover":
        return {
          title: `${fromName} ↔ ${toName} connected`,
          body: `A crossover cable links two devices of the same kind (${fromLabel} to ${toLabel}). The transmit wires on one end meet the receive wires on the other, so they can talk directly.`,
          kind: "success",
        };
      case "console":
        return {
          title: `Console link to ${toName}`,
          body: `The ${fromLabel} is now the management terminal for the ${toLabel}. Through this console cable you can open its command line and change its settings.`,
          kind: "success",
        };
      case "serial":
        return {
          title: `WAN link ${fromName} ↔ ${toName}`,
          body: `A serial cable joins two routers (${fromLabel} and ${toLabel}) over a wide-area link — the kind of connection ISPs use between sites.`,
          kind: "success",
        };
      case "fiber":
        return {
          title: `Fiber link ${fromName} ↔ ${toName}`,
          body: `Fiber carries data as pulses of light. It is the fast, long-distance link between ${fromLabel} and ${toLabel}.`,
          kind: "success",
        };
    }
  }

  const sameKindHint = sameKind
    ? `A straight-through cable joins different device types; to join two ${toLabel}s, pick Crossover instead.`
    : `Try a straight-through cable — it is made for joining different device types like these.`;
  return {
    title: "That cable won't work here",
    body: `${error ?? "These two devices cannot use this cable."} ${sameKindHint}`,
    kind: "error",
  };
}

/** Plain-language "why does this ping fail?" card built from the engine diagnosis. */
export function pingFailureExplanation(d: { step: string; message: string; hint: string }): TeachingNote {
  return {
    title: "Why does this ping fail?",
    body: `${d.message} ${diagnosisTip(d.step)} ${d.hint ? `Try: ${d.hint}` : ""}`,
    kind: "error",
  };
}

/** Teaching tip for a diagnosis step key returned by the engine. */
export function diagnosisTip(step: string): string {
  const tips: Record<string, string> = {
    source: "Pick a source device that is part of the network.",
    interface: "A port left in 'shutdown' cannot carry traffic. Re-enable it with 'no shutdown'.",
    ip: "Every participating device needs an IP and subnet mask — DHCP makes this automatic.",
    target: "The ping target must be a real IP configured on some device.",
    gateway: "To reach other networks, an end device must know its gateway — the router's LAN IP.",
    reachability: "Devices that talk at layer 2 must share a cable path through switches / access points, all links up.",
    route: "Routers forward based on their routing table. Add a static route for networks they are not directly connected to.",
    done: "Everything checks out — the packet path is healthy.",
  };
  return tips[step] ?? "Fix the problem the message describes, then try again.";
}

/** One-line takeaway shown after a successful trace. */
export function summaryTip(result: { ok: boolean; summary: string }): string {
  return result.ok
    ? "Replies mean the whole path — L1 cables, L2 MAC delivery and L3 routing — is working."
    : "The trace shows exactly where the packet stopped. Diagnose that step, fix it, and send the packet again.";
}
