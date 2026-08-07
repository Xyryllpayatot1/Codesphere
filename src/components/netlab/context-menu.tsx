"use client";

import { useState } from "react";
import { Copy, Edit3, RotateCw, Trash2, Unplug, X, CopyPlus, Zap, Power } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { cn } from "@/lib/utils";

export function ContextMenu() {
  const { contextMenu, closeContextMenu, removeDevice, renameDevice, duplicateDevice, copyDevice, rotateDevice, disconnectDevice, openConfig, togglePower } = useNetlab();
  const [renamingFor, setRenamingFor] = useState<string | null>(null);

  if (!contextMenu) return null;
  const { x, y, deviceId } = contextMenu;
  const device = useNetlab.getState().sim.devices.find((d) => d.id === deviceId);
  if (!device) return null;
  const off = device.poweredOn === false;

  const menuX = Math.min(x, window.innerWidth - 220);
  const menuY = Math.min(y, window.innerHeight - 320);
  const renaming = renamingFor === deviceId;

  const item = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition hover:bg-secondary";

  return (
    <div className="fixed inset-0 z-40" onClick={closeContextMenu} onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}>
      <div
        className="absolute w-52 rounded-xl border border-border bg-card p-1.5 shadow-2xl"
        style={{ left: menuX, top: menuY }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-2 py-1">
          <p className="truncate text-[11px] font-semibold text-muted-foreground">{device.config.hostname}</p>
          <button onClick={closeContextMenu} className="rounded p-0.5 text-muted-foreground hover:bg-secondary" aria-label="Close menu">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {renaming ? (
          <div className="px-1 pb-1">
            <input
              autoFocus
              defaultValue={device.config.hostname}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  renameDevice(deviceId, (e.currentTarget as HTMLInputElement).value);
                  setRenamingFor(null);
                }
                if (e.key === "Escape") setRenamingFor(null);
              }}
              onBlur={(e) => {
                renameDevice(deviceId, e.target.value);
                setRenamingFor(null);
              }}
              className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="New name"
            />
          </div>
        ) : (
          <>
            <button className={item} onClick={() => openConfig(deviceId)}>
              <Zap className="h-3.5 w-3.5 text-muted-foreground" /> Configure
            </button>
            <button className={item} onClick={() => setRenamingFor(deviceId)}>
              <Edit3 className="h-3.5 w-3.5 text-muted-foreground" /> Rename
            </button>
            <button className={item} onClick={() => rotateDevice(deviceId)}>
              <RotateCw className="h-3.5 w-3.5 text-muted-foreground" /> Rotate 90°
            </button>
            <button className={item} onClick={() => togglePower(deviceId)}>
              <Power className={cn("h-3.5 w-3.5", off ? "text-success" : "text-muted-foreground")} />
              {off ? "Power on" : "Power off"}
            </button>
            <div className="my-1 h-px bg-border" />
            <button className={item} onClick={() => duplicateDevice(deviceId)}>
              <CopyPlus className="h-3.5 w-3.5 text-muted-foreground" /> Duplicate
            </button>
            <button className={item} onClick={() => copyDevice(deviceId)}>
              <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copy
            </button>
            <button className={item} onClick={() => disconnectDevice(deviceId)}>
              <Unplug className="h-3.5 w-3.5 text-muted-foreground" /> Disconnect all
            </button>
            <div className="my-1 h-px bg-border" />
            <button className={cn(item, "text-destructive hover:bg-destructive/10")} onClick={() => removeDevice(deviceId)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
