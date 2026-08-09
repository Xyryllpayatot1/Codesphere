"use client";

import { GripVertical, Lock } from "lucide-react";
import { DEVICE_TYPES } from "@/lib/net/devices";
import type { DeviceType } from "@/lib/net/types";
import { useNetlab } from "./netlab-store";
import { DeviceIcon, deviceColor } from "./device-icon";
import { deviceTip } from "@/lib/net/explain";
import { cn } from "@/lib/utils";
import { devicesAtLevel, type LabLevel } from "./lab-levels";

const ORDER: DeviceType[] = ["pc", "laptop", "server", "printer", "switch", "hub", "router", "wirelessRouter", "accessPoint", "firewall", "cloud"];

export const PALETTE_DRAG_TYPE = "application/x-netlab-device";

export function Palette({ level }: { level: LabLevel }) {
  const addDevice = useNetlab((s) => s.addDevice);
  const visible = devicesAtLevel(level, ORDER);
  const hiddenCount = ORDER.length - visible.length;

  const onDragStart = (e: React.DragEvent, type: DeviceType) => {
    e.dataTransfer.setData(PALETTE_DRAG_TYPE, type);
    e.dataTransfer.setData("text/plain", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex w-44 shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-border bg-card/60 p-2 backdrop-blur">
      <div className="px-1 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Devices</p>
        <p className="text-[10px] text-muted-foreground/70">Drag onto the canvas, or click to place.</p>
      </div>
      {visible.map((type) => {
        const def = DEVICE_TYPES[type];
        return (
          <button
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            onClick={() => addDevice(type)}
            title={deviceTip(type)}
            className="group flex cursor-grab items-center gap-2 rounded-lg border border-border bg-background/60 px-2 py-1.5 text-left transition hover:border-primary/40 hover:bg-secondary active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
            <DeviceIcon type={type} className={cn("h-6 w-6 shrink-0", deviceColor(type))} />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{def.label}</p>
              <p className="truncate text-[9px] text-muted-foreground">{def.description}</p>
            </div>
          </button>
        );
      })}
      {hiddenCount > 0 && (
        <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-background/40 px-2 py-1.5 text-[10px] text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          {hiddenCount} more devices unlock at {level === "beginner" ? "Intermediate" : "Advanced"} level
        </div>
      )}
    </div>
  );
}
