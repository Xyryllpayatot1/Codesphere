"use client";

import { GripVertical } from "lucide-react";
import { DEVICE_TYPES } from "@/lib/net/devices";
import type { DeviceType } from "@/lib/net/types";
import { useNetlab } from "./netlab-store";
import { DeviceIcon, deviceColor } from "./device-icon";
import { deviceTip } from "@/lib/net/explain";
import { cn } from "@/lib/utils";

const ORDER: DeviceType[] = ["pc", "laptop", "server", "printer", "switch", "hub", "router", "wirelessRouter", "accessPoint", "firewall", "cloud"];

export const PALETTE_DRAG_TYPE = "application/x-netlab-device";

export function Palette() {
  const addDevice = useNetlab((s) => s.addDevice);

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
      {ORDER.map((type) => {
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
    </div>
  );
}
