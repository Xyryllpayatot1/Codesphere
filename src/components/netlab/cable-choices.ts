import type { CableType } from "@/lib/net/types";

/** Shared cable-type choices — the single source of truth for both the
 * desktop CableChooser dropdown and the mobile cable-type selector. */
export const CABLE_CHOICES: { type: CableType; scene: string; tech: string; why: string }[] = [
  {
    type: "copperStraight",
    scene: "Computer to Switch",
    tech: "Straight-Through Cable",
    why: "Pins line up one-to-one, so a PC and a switch can exchange traffic directly.",
  },
  {
    type: "copperCrossover",
    scene: "Switch to Switch",
    tech: "Crossover Cable",
    why: "It swaps the transmit and receive pairs, letting two like devices (switch to switch) talk without a router.",
  },
  {
    type: "console",
    scene: "PC to Router/Switch CLI",
    tech: "Console Cable",
    why: "Used for configuration over the serial line — it's for setup, not for network traffic.",
  },
  {
    type: "serial",
    scene: "Router to Router (WAN)",
    tech: "Serial Cable",
    why: "WAN links between routers use serial connections to carry traffic over longer distances.",
  },
  {
    type: "fiber",
    scene: "Fast backbone link",
    tech: "Fiber Cable",
    why: "Fiber sends light pulses — fast and reliable, ideal for high-speed backbone links.",
  },
];
