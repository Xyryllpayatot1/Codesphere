import { Network, TerminalSquare, Route, Wifi, ShieldCheck, GitBranch } from "lucide-react";

const CAPABILITIES = [
  {
    icon: Network,
    title: "Build real topologies",
    text: "Place routers, switches, PCs and servers on the canvas and cable them exactly like physical hardware.",
  },
  {
    icon: GitBranch,
    title: "Real packet simulation",
    text: "Pings, ARP lookups, MAC learning, VLANs and longest-prefix routing are computed by a genuine network engine — not scripted animations.",
  },
  {
    icon: TerminalSquare,
    title: "Device CLI",
    text: "Configure devices through a Cisco-style IOS command line with modes, running/startup configs and command history.",
  },
  {
    icon: Route,
    title: "Guided missions",
    text: "Structured objectives from your first LAN to routed multi-network topologies — verified against the live simulation state.",
  },
  {
    icon: Wifi,
    title: "Wireless & services",
    text: "DHCP pools, DNS records, wireless SSIDs and per-device services that actually change how traffic flows.",
  },
  {
    icon: ShieldCheck,
    title: "Diagnose faults",
    text: "Broken links, wrong gateways, missing routes — track packets layer by layer and find out exactly why traffic fails.",
  },
];

/**
 * Networking Laboratory showcase. The lab is CreyvaPH's core differentiator;
 * this section explains it in engineering terms rather than marketing gloss.
 */
export function LabShowcase() {
  return (
    <section id="networking-lab" className="scroll-mt-14 border-y border-border bg-sunken/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Networking Laboratory</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            A network simulator that behaves like the real thing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Most platforms show networking as diagrams. CreyvaPH lets you build the network — then
            proves whether it works by simulating every packet.
          </p>
        </div>

        {/* Topology illustration */}
        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-xl border border-border bg-[#0d1117] p-6 dark:bg-[#0b0e14] sm:p-8" aria-hidden>
          <svg viewBox="0 0 560 190" className="w-full" role="img">
            {/* cables */}
            <path d="M 90 95 H 210" stroke="#3b8558" strokeWidth="2" />
            <path d="M 270 95 H 350" stroke="#3b8558" strokeWidth="2" />
            <path d="M 410 95 H 470" stroke="#3f7cb3" strokeWidth="2" strokeDasharray="1 0" />
            {/* packet moving across R1 -> Server segment (CSS-animated) */}
            <circle r="3.5" fill="#22d3ee" cx="0" cy="0">
              <animateMotion dur="2.6s" repeatCount="indefinite" path="M 270 95 H 470" />
            </circle>

            {/* PC1 */}
            <rect x="30" y="72" width="60" height="46" rx="6" fill="#161d29" stroke="#334155" />
            <text x="60" y="99" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">PC1</text>
            <text x="60" y="134" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">192.168.1.10</text>

            {/* SW1 */}
            <rect x="210" y="80" width="60" height="30" rx="5" fill="#161d29" stroke="#334155" />
            <text x="240" y="99" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">SW1</text>
            <text x="240" y="134" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">VLAN 10</text>

            {/* R1 */}
            <rect x="350" y="76" width="60" height="38" rx="17" fill="#161d29" stroke="#334155" />
            <text x="380" y="99" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">R1</text>
            <text x="380" y="134" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">gateway</text>

            {/* SRV1 */}
            <rect x="470" y="72" width="60" height="46" rx="6" fill="#161d29" stroke="#334155" />
            <text x="500" y="99" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">SRV1</text>
            <text x="500" y="134" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">10.0.2.10</text>
          </svg>
        </div>

        <div className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="flex flex-col">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card">
                <c.icon className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <h3 className="text-sm font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
