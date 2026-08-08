"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { PALETTE_DRAG_TYPE } from "./palette";
import { DeviceIcon, deviceColor } from "./device-icon";
import { deviceTip } from "@/lib/net/explain";
import { CABLE_TYPES, DEVICE_SIZE, deviceAnchor } from "@/lib/net/types";
import type { Cable, Device } from "@/lib/net/types";
import { samplePolyline } from "./animations";
import { cn } from "@/lib/utils";

const WORLD = 3000;

function cablePath(c: Cable, from: Device, to: Device) {
  const kind = CABLE_TYPES[c.type].portKind;
  const a = { x: from.x + deviceAnchor(from, kind).x, y: from.y + deviceAnchor(from, kind).y };
  const b = { x: to.x + deviceAnchor(to, kind).x, y: to.y + deviceAnchor(to, kind).y };
  const dx = (b.x - a.x) / 2;
  const midX = a.x + dx;
  const curve = Math.max(14, Math.abs(dx) * 0.35);
  const ctrl = { x: midX, y: Math.min(a.y, b.y) - curve };
  return { d: `M ${a.x} ${a.y} Q ${ctrl.x} ${ctrl.y} ${b.x} ${b.y}`, a, b };
}

export function Canvas() {
  const state = useNetlab();
  const {
    sim,
    tool,
    cableType,
    cableFrom,
    selectedDeviceId,
    hoverDeviceId,
    pingSourceId,
    pan,
    zoom,
    gridSnap,
    trace,
    packets,
    bursts,
    select,
    setHover,
    setPingSource,
    armCable,
    disarmCable,
    removeDevice,
    removeCable,
    moveDevice,
    snapDevice,
    setPan,
    setZoom,
    openConfig,
    openContextMenu,
    closeContextMenu,
    tickAnimations,
  } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ type: "pan" | "device"; id?: string; startX: number; startY: number; origPan?: { x: number; y: number }; origPos?: { x: number; y: number } } | null>(null);
  const [dragState, setDragState] = useState<{ id: string } | null>(null);
  const [now, setNow] = useState(0);

  // Touch gestures: track every active pointer (including pointers captured by
  // device divs) via capture-phase handlers so two-finger pinch/pan works.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; startZoom: number; startPan: { x: number; y: number }; mid: { x: number; y: number } } | null>(null);
  const lastTapRef = useRef<{ t: number; deviceId: string } | null>(null);
  const longPressRef = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPressRef.current != null) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const hasAnim = packets.length > 0 || bursts.length > 0;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      const next = Math.min(2.4, Math.max(0.4, zoom * factor));
      const k = next / zoom;
      setZoom(next);
      setPan({ x: mx - (mx - pan.x) * k, y: my - (my - pan.y) * k });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, pan, setZoom, setPan]);

  useEffect(() => {
    if (!hasAnim) return;
    let raf: number;
    const loop = () => {
      const n = performance.now();
      setNow(n);
      tickAnimations(n);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hasAnim, tickAnimations]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const sel = useNetlab.getState().selectedDeviceId;
      const g = useNetlab.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        if (sel) { g.copyDevice(sel); e.preventDefault(); }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        g.paste();
        e.preventDefault();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        if (sel) { g.duplicateDevice(sel); e.preventDefault(); }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (sel) { g.removeDevice(sel); e.preventDefault(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const worldFromClient = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  };

  // Capture-phase handlers see every pointer (even ones captured by device
  // divs), which lets us implement two-finger pinch-zoom and pan on touch.
  const onPointerDownCapture = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      dragRef.current = null;
      setDragState(null);
      clearLongPress();
      pinchRef.current = {
        dist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)),
        startZoom: zoom,
        startPan: { ...pan },
        mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      };
    }
  };

  const onPointerMoveCapture = (e: React.PointerEvent) => {
    const cur = pointersRef.current.get(e.pointerId);
    if (cur) {
      cur.x = e.clientX;
      cur.y = e.clientY;
    }
    const pinch = pinchRef.current;
    if (!pinch || pointersRef.current.size < 2) return;
    const pts = [...pointersRef.current.values()];
    const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const nextZoom = Math.min(2.4, Math.max(0.4, pinch.startZoom * (dist / pinch.dist)));
    const k = nextZoom / pinch.startZoom;
    setZoom(nextZoom);
    setPan({ x: mid.x - (mid.x - pinch.startPan.x) * k, y: mid.y - (mid.y - pinch.startPan.y) * k });
  };

  const onPointerUpCapture = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(PALETTE_DRAG_TYPE) || e.dataTransfer.types.includes("text/plain")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData(PALETTE_DRAG_TYPE) || e.dataTransfer.getData("text/plain");
    if (!type) return;
    e.preventDefault();
    const p = worldFromClient(e.clientX, e.clientY);
    useNetlab.getState().addDeviceAt(type as Device["type"], p.x - DEVICE_SIZE.width / 2, p.y - DEVICE_SIZE.height / 2);
  };

  const onBackgroundDown = (e: React.PointerEvent) => {
    if (pointersRef.current.size >= 2) return;
    if (e.button === 2) {
      closeContextMenu();
      return;
    }
    if (tool === "cable" && cableFrom) {
      disarmCable();
      return;
    }
    if (tool === "select" || tool === "delete" || tool === "ping") {
      dragRef.current = { type: "pan", startX: e.clientX, startY: e.clientY, origPan: { ...pan } };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (tool === "select") {
      select(null);
      closeContextMenu();
    }
  };

  const onBackgroundMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag?.type === "pan" && drag.origPan) {
      setPan({ x: drag.origPan.x + (e.clientX - drag.startX), y: drag.origPan.y + (e.clientY - drag.startY) });
    }
  };

  const onBackgroundUp = () => {
    dragRef.current = null;
  };

  const onDeviceDown = (e: React.PointerEvent, d: Device) => {
    e.stopPropagation();
    if (pointersRef.current.size >= 2) return;
    if (e.button === 2) return;
    closeContextMenu();
    if (tool === "cable") {
      armCable(d.id);
      return;
    }
    if (tool === "delete") {
      removeDevice(d.id);
      return;
    }
    if (tool === "ping") {
      setPingSource(d.id);
      return;
    }
    select(d.id);
    dragRef.current = { type: "device", id: d.id, startX: e.clientX, startY: e.clientY, origPos: { x: d.x, y: d.y } };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({ id: d.id });
    // Long-press on a device opens its context menu (touch has no right-click).
    clearLongPress();
    longPressRef.current = window.setTimeout(() => {
      longPressRef.current = null;
      openContextMenu(e.clientX, e.clientY, d.id);
    }, 550);
  };

  const onDeviceMove = (e: React.PointerEvent, d: Device) => {
    const drag = dragRef.current;
    if (drag?.type === "device" && drag.id === d.id && drag.origPos) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) clearLongPress();
      moveDevice(d.id, Math.max(0, drag.origPos.x + dx / zoom), Math.max(0, drag.origPos.y + dy / zoom));
    }
  };

  const onDeviceUp = (e: React.PointerEvent, d: Device) => {
    clearLongPress();
    const drag = dragRef.current;
    const moved =
      drag?.type === "device" &&
      drag.id === d.id &&
      (Math.abs(e.clientX - drag.startX) > 8 || Math.abs(e.clientY - drag.startY) > 8);
    if (!moved) {
      // Tap detection — double-tap opens configuration (touch has no double-click).
      const now = e.timeStamp;
      const last = lastTapRef.current;
      if (last && last.deviceId === d.id && now - last.t < 320) {
        openConfig(d.id);
        lastTapRef.current = null;
      } else {
        lastTapRef.current = { t: now, deviceId: d.id };
      }
    }
    if (dragState?.id === d.id) snapDevice(d.id);
    dragRef.current = null;
    setDragState(null);
  };

  const onDeviceDoubleClick = (e: React.MouseEvent, d: Device) => {
    e.stopPropagation();
    openConfig(d.id);
  };

  const onDeviceContextMenu = (e: React.MouseEvent, d: Device) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e.clientX, e.clientY, d.id);
  };

  const zoomIn = () => setZoom(Math.min(2.4, zoom * 1.2));
  const zoomOut = () => setZoom(Math.max(0.4, zoom * 0.833));

  const cables = sim.cables;
  const byId = new Map(sim.devices.map((d) => [d.id, d]));
  const activeCables = new Set((trace?.steps ?? []).map((s) => s.cableId).filter((x): x is string => Boolean(x)));
  const activeCableColor = trace?.ok ? "#22c55e" : "#ef4444";

  const fault = !trace?.ok ? trace?.fault : undefined;
  const faultDevices = new Set(fault?.deviceIds ?? []);
  const faultCables = new Set(fault?.cableIds ?? []);
  const faultIfaceDevices = new Set(
    fault?.ifaceIds?.length
      ? sim.devices.filter((d) => d.config.interfaces.some((i) => fault.ifaceIds.includes(i.id))).map((d) => d.id)
      : []
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden select-none bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.14)_1px,transparent_0)] [background-size:26px_26px]"
      onPointerDown={onBackgroundDown}
      onPointerMove={onBackgroundMove}
      onPointerUp={onBackgroundUp}
      onPointerLeave={onBackgroundUp}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMoveCapture={onPointerMoveCapture}
      onPointerUpCapture={onPointerUpCapture}
      onPointerCancelCapture={onPointerUpCapture}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={(e) => {
        e.preventDefault();
        closeContextMenu();
      }}
      style={{ cursor: tool === "select" ? "grab" : tool === "cable" ? "crosshair" : tool === "delete" ? "not-allowed" : "default" }}
    >
      <div
        className="absolute left-0 top-0"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", width: WORLD, height: WORLD }}
      >
        <svg className="pointer-events-none absolute left-0 top-0" width={WORLD} height={WORLD} style={{ overflow: "visible" }}>
          {/* cables */}
          {cables.map((c) => {
            const a = byId.get(c.fromDevice);
            const b = byId.get(c.toDevice);
            if (!a || !b) return null;
            const st = sim.cableState(c.id);
            const color = st === "down" ? "#64748b" : CABLE_TYPES[c.type].color;
            const active = activeCables.has(c.id);
            const faulted = faultCables.has(c.id);
            const { d, a: pa, b: pb } = cablePath(c, a, b);
            return (
              <g key={c.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); if (tool === "delete") removeCable(c.id); }}>
                {faulted && <path d={d} fill="none" stroke="#ef4444" strokeWidth={7} opacity={0.28} strokeLinecap="round" className="animate-pulse" />}
                {active && <path d={d} fill="none" stroke={activeCableColor} strokeWidth={5} opacity={0.35} strokeLinecap="round" />}
                <path d={d} fill="none" stroke={faulted ? "#ef4444" : color} strokeWidth={active ? 3.5 : st === "down" ? 1.5 : faulted ? 3.5 : 2.5} strokeDasharray={st === "down" ? "5 4" : active ? "10 6" : undefined} opacity={0.9} />
                <circle cx={(pa.x + pb.x) / 2} cy={(pa.y + pb.y) / 2} r={faulted ? 4.5 : 3} fill={faulted ? "#ef4444" : color} />
              </g>
            );
          })}

          {/* wireless links */}
          {sim.wirelessLinks.map((w) => {
            const a = byId.get(w.deviceId);
            const b = byId.get(w.apId);
            if (!a || !b) return null;
            const p1 = { x: a.x + DEVICE_SIZE.width / 2, y: a.y + DEVICE_SIZE.height / 2 };
            const p2 = { x: b.x + DEVICE_SIZE.width / 2, y: b.y + DEVICE_SIZE.height / 2 };
            return (
              <g key={w.id}>
                <path d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`} fill="none" stroke="#22d3ee" strokeWidth={4} opacity={0.15} />
                <path d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`} fill="none" stroke="#22d3ee" strokeWidth={2} strokeDasharray="6 5" opacity={0.8} />
              </g>
            );
          })}

          {/* broadcast ripples */}
          {bursts.map((b) => {
            const d = byId.get(b.deviceId);
            if (!d) return null;
            const t = Math.min(1, Math.max(0, (now - b.startedAt) / b.duration));
            const c = { x: d.x + DEVICE_SIZE.width / 2, y: d.y + DEVICE_SIZE.height / 2 };
            const r = 6 + t * 46;
            return <circle key={b.id} cx={c.x} cy={c.y} r={r} fill="none" stroke={b.color} strokeWidth={2.5} opacity={0.7 * (1 - t)} />;
          })}

          {/* traveling packets */}
          {packets.map((p) => {
            const t = Math.min(1, Math.max(0, (now - p.startedAt) / p.duration));
            if (p.points.length === 1) {
              const c = p.points[0];
              const r = 6 + t * 24;
              return <circle key={p.id} cx={c.x} cy={c.y} r={r} fill="none" stroke={p.color} strokeWidth={2.5} opacity={0.7 * (1 - t)} />;
            }
            const pos = samplePolyline(p.points, t);
            return (
              <g key={p.id}>
                <polyline points={p.points.map((pt) => `${pt.x},${pt.y}`).join(" ")} fill="none" stroke={p.color} strokeWidth={1.5} opacity={0.22} />
                <circle cx={pos.x} cy={pos.y} r={6} fill={p.color} stroke="#0f172a" strokeWidth={1.5} />
                <circle cx={pos.x} cy={pos.y} r={11} fill={p.color} opacity={0.25} />
                {p.label && (
                  <text x={pos.x + 12} y={pos.y - 10} fill={p.color} fontSize={13} fontWeight={700} fontFamily="ui-monospace, monospace">
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* cable-arm indicator */}
          {cableFrom &&
            (() => {
              const f = byId.get(cableFrom.deviceId);
              if (!f) return null;
              const kind = CABLE_TYPES[cableType].portKind;
              const an = deviceAnchor(f, kind);
              const p = { x: f.x + an.x, y: f.y + an.y };
              return <circle cx={p.x} cy={p.y} r={7} fill="none" stroke={CABLE_TYPES[cableType].color} strokeWidth={2.5} className="animate-pulse" />;
            })()}
        </svg>

        {/* devices */}
        {sim.devices.map((d) => {
          const selected = selectedDeviceId === d.id;
          const isSource = pingSourceId === d.id;
          const isCableTarget = tool === "cable" && cableFrom && cableFrom.deviceId !== d.id;
          const isHovered = hoverDeviceId === d.id;
          const ip = d.config.interfaces.find((i) => i.ip)?.ip;
          const off = d.poweredOn === false || d.config.interfaces.every((i) => i.status === "down");
          const faulted = faultDevices.has(d.id) || faultIfaceDevices.has(d.id);
          return (
            <div
              key={d.id}
              className={cn(
                "absolute rounded-lg transition-shadow",
                selected ? "z-20 ring-2 ring-primary ring-offset-2 ring-offset-background" : "z-10",
                faulted && "z-20 ring-2 ring-red-500 ring-offset-2 ring-offset-background",
                isCableTarget && (isHovered ? "ring-2 ring-cyan-300" : "hover:ring-2 hover:ring-cyan-400"),
                dragState?.id === d.id && "z-30 shadow-2xl"
              )}
              style={{ left: d.x, top: d.y, width: DEVICE_SIZE.width, height: DEVICE_SIZE.height }}
              onPointerDown={(e) => onDeviceDown(e, d)}
              onPointerMove={(e) => onDeviceMove(e, d)}
              onPointerUp={(e) => onDeviceUp(e, d)}
              onPointerEnter={() => setHover(d.id)}
              onPointerLeave={() => setHover(null)}
              onDoubleClick={(e) => onDeviceDoubleClick(e, d)}
              onContextMenu={(e) => onDeviceContextMenu(e, d)}
              title={deviceTip(d.type)}
            >
              <div className={cn("flex h-full flex-col items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm", off ? "opacity-40 grayscale" : "")}>
                <span
                  className={cn("flex items-center justify-center", (d.rotation ?? 0) % 360 !== 0 && "scale-90")}
                  style={{ transform: `rotate(${d.rotation ?? 0}deg)`, transition: "transform 120ms ease" }}
                >
                  <DeviceIcon type={d.type} className={cn("h-9 w-9", deviceColor(d.type))} />
                </span>
                <span className={cn("mt-0.5 max-w-full truncate px-1 text-[10px] font-semibold leading-tight", deviceColor(d.type))}>
                  {d.config.hostname}
                </span>
                {ip && <span className="max-w-full truncate px-1 text-[9px] leading-tight text-muted-foreground">{ip}</span>}
              </div>
              {faulted && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2" title={fault?.reason}>
                  <AlertTriangle className="h-4 w-4 drop-shadow text-red-500" />
                </span>
              )}
              {d.poweredOn === false && (
                <span className="absolute -bottom-2 right-0 rounded bg-destructive px-1 py-0.5 text-[8px] font-bold leading-none text-white">
                  OFF
                </span>
              )}
              {isSource && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-cyan-500 px-1.5 py-0.5 text-[9px] font-bold text-cyan-950">
                  PING
                </span>
              )}
              {selected && !faulted && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                  {DEVICE_TYPES_LABEL(d.type)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-xl border border-border bg-card/90 p-1 shadow-lg backdrop-blur">
        <button className="rounded-lg px-2.5 py-1 text-sm hover:bg-secondary" onClick={zoomIn} aria-label="Zoom in">+</button>
        <span className="text-center text-[10px] text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <button className="rounded-lg px-2.5 py-1 text-sm hover:bg-secondary" onClick={zoomOut} aria-label="Zoom out">−</button>
      </div>

      {/* grid snap badge */}
      {gridSnap && (
        <div className="pointer-events-none absolute right-4 top-3 rounded-full border border-border bg-card/80 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
          snap to grid
        </div>
      )}

      {/* tool hint */}
      <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-xl border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
        {toolHint(tool, cableType, !!cableFrom, trace)}
      </div>
    </div>
  );
}

function DEVICE_TYPES_LABEL(type: string) {
  return type.replace(/([A-Z])/g, " $1").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function toolHint(tool: string, cableType: string, armed: boolean, trace: { ok: boolean } | null) {
  if (tool === "cable") {
    const def = CABLE_TYPES[cableType as keyof typeof CABLE_TYPES];
    return armed
      ? `Click a second device to connect. Cable: ${def.friendly}.`
      : `Click the first device to start a ${def.friendly.toLowerCase()} cable, then a second device. Drag devices from the left panel.`;
  }
  if (tool === "delete") return "Click a device or cable to delete it. Right-click a device for more options.";
  if (tool === "ping") return "Click a source device, then send a ping from the Packet Lab at the bottom.";
  return trace
    ? trace.ok
      ? "Network is healthy — the packet reached its destination."
      : "Packet stopped — open the Packet Lab and run Diagnose."
    : "Drag devices onto the canvas. Double-click to configure. Right-click for options.";
}
