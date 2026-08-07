// ---------------------------------------------------------------------------
// Visual animations — derived from a packet TraceResult. Pure functions.
// The canvas turns these into moving dots, pulses and broadcast ripples.
// ---------------------------------------------------------------------------

import type { Cable, Device, TraceResult } from "@/lib/net/types";
import { CABLE_TYPES, DEVICE_SIZE, deviceAnchor } from "@/lib/net/types";

export type AnimPoint = { x: number; y: number };

export type PacketAnim = {
  id: string;
  /** World-space polyline the dot travels along. 1 point = stationary pulse. */
  points: AnimPoint[];
  color: string;
  label: string;
  /** performance.now() at spawn. */
  startedAt: number;
  duration: number;
};

export type Burst = {
  id: string;
  deviceId: string;
  color: string;
  startedAt: number;
  duration: number;
};

const OK = "#22c55e";
const FAIL = "#ef4444";
const CTL = "#22d3ee";

const HOP_MS = 460;

let SEQ = 0;
const uid = () => `anim-${Date.now()}-${(SEQ++).toString(36)}`;

export function deviceCenter(d: Device): AnimPoint {
  return { x: d.x + DEVICE_SIZE.width / 2, y: d.y + DEVICE_SIZE.height / 2 };
}

/** Points along a cable's quadratic bezier (port → port), matching canvas drawing. */
export function cableBezier(cable: Cable, from: Device, to: Device): AnimPoint[] {
  const kind = CABLE_TYPES[cable.type].portKind;
  const a = { x: from.x + deviceAnchor(from, kind).x, y: from.y + deviceAnchor(from, kind).y };
  const b = { x: to.x + deviceAnchor(to, kind).x, y: to.y + deviceAnchor(to, kind).y };
  const dx = (b.x - a.x) / 2;
  const midX = a.x + dx;
  const curve = Math.max(14, Math.abs(dx) * 0.35);
  const ctrl = { x: midX, y: Math.min(a.y, b.y) - curve };
  const out: AnimPoint[] = [];
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const mt = 1 - t;
    out.push({
      x: mt * mt * a.x + 2 * mt * t * ctrl.x + t * t * b.x,
      y: mt * mt * a.y + 2 * mt * t * ctrl.y + t * t * b.y,
    });
  }
  return out;
}

/** Sample a polyline at t ∈ [0,1]. */
export function samplePolyline(pts: AnimPoint[], t: number): AnimPoint {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0];
  const clamped = Math.max(0, Math.min(1, t));
  let total = 0;
  const lens: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    lens.push(l);
    total += l;
  }
  if (total === 0) return pts[0];
  let target = clamped * total;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i]) {
      const seg = lens[i] === 0 ? 0 : target / lens[i];
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * seg,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * seg,
      };
    }
    target -= lens[i];
  }
  return pts[pts.length - 1];
}

/**
 * Convert a trace into animated packets + broadcast bursts.
 * Returns everything starting at `now`; the canvas ticks progress over time.
 */
export function traceAnimations(devices: Device[], cables: Cable[], trace: TraceResult, now: number): { packets: PacketAnim[]; bursts: Burst[] } {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const packets: PacketAnim[] = [];
  const bursts: Burst[] = [];
  const label = trace.type.toUpperCase();
  let offset = 0;
  let cursor = trace.sourceId;

  const pulse = (deviceId: string, color: string, dur = 320, lab = "") => {
    const d = byId.get(deviceId);
    if (!d) return;
    packets.push({ id: uid(), points: [deviceCenter(d)], color, label: lab, startedAt: now + offset, duration: dur });
    offset += dur;
  };
  const hop = (deviceId: string, color: string) => {
    const d = byId.get(deviceId);
    if (!d) return;
    const cable = cables.find((c) => (c.fromDevice === cursor && c.toDevice === deviceId) || (c.toDevice === cursor && c.fromDevice === deviceId));
    const from = byId.get(cursor) ?? d;
    if (cable && from) {
      const points = cableBezier(cable, from, d);
      packets.push({ id: uid(), points, color, label, startedAt: now + offset, duration: HOP_MS });
      offset += HOP_MS;
      cursor = deviceId;
    } else {
      pulse(deviceId, color, 280, label);
    }
  };

  for (const s of trace.steps) {
    const isFail = s.status === "fail";
    const d = byId.get(s.deviceId);
    const broadcast = s.action === "ARP request" || s.action === "Flood" || s.action === "MAC lookup" && s.status === "warn";

    if (broadcast && d) {
      bursts.push({ id: uid(), deviceId: d.id, color: CTL, startedAt: now + offset, duration: 700 });
    }
    if (isFail && d) {
      bursts.push({ id: uid(), deviceId: d.id, color: FAIL, startedAt: now + offset, duration: 700 });
      pulse(d.id, FAIL, 360, "!");
      continue;
    }
    if (s.cableId) {
      hop(s.deviceId, isFail ? FAIL : OK);
    } else if (s.action === "ARP request" || s.action === "ARP reply") {
      pulse(s.deviceId, CTL, 360, "ARP");
    } else if (s.action === "Delivered at L2" || s.action === "Delivered") {
      pulse(s.deviceId, OK, 380, trace.ok ? "✓" : "");
    } else {
      // Routing / addressing steps — a soft tick at the device.
      pulse(s.deviceId, isFail ? FAIL : "#94a3b8", 240, s.status === "warn" ? "?" : "");
    }
  }

  return { packets, bursts };
}
