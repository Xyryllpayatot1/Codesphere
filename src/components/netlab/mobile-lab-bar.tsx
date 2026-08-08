"use client";

import { useState } from "react";
import {
  Cable,
  FlaskConical,
  FolderOpen,
  Menu,
  MousePointer2,
  Network,
  Plus,
  Radar,
  Rocket,
  Save,
  Sparkles,
  Target,
  Trash2,
  Undo2,
  Upload,
  Download,
  Grid3x3,
  Layers,
  X,
  ChevronRight,
} from "lucide-react";
import { useNetlab } from "./netlab-store";
import { DeviceIcon, deviceColor } from "./device-icon";
import { DEVICE_TYPES } from "@/lib/net/devices";
import type { DeviceType } from "@/lib/net/types";
import { CABLE_TYPES } from "@/lib/net/types";
import { TracePanel } from "./trace-panel";
import { CableSheet } from "./cable-sheet";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

const DEVICE_ORDER: DeviceType[] = ["pc", "laptop", "server", "printer", "switch", "hub", "router", "wirelessRouter", "accessPoint", "firewall", "cloud"];

/** Floating bottom toolbar for touch screens. */
export function MobileLabBar({
  onOpenTopologies,
  onOpenProjects,
}: {
  onOpenTopologies: () => void;
  onOpenProjects: () => void;
}) {
  const { tool, setTool, cableType, cableFrom, undo, gridSnap, setGridSnap, mode, setMode, setMissionPickerOpen } = useNetlab();
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [packetOpen, setPacketOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cableSheetOpen, setCableSheetOpen] = useState(false);

  const onImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => useNetlab.getState().importJson(String(reader.result ?? ""));
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-x-3 bottom-20 z-30 flex flex-col items-center gap-1.5 lg:hidden">
        {tool === "cable" && (
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-primary/40 bg-card/95 px-3 py-2 shadow-2xl backdrop-blur">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CABLE_TYPES[cableType].color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium leading-tight text-foreground">
                Cable: {CABLE_TYPES[cableType].friendly}
              </p>
              <p className="truncate text-[10px] leading-tight text-muted-foreground">
                {cableFrom ? "Tap the second device…" : "Tap the first device…"}
              </p>
            </div>
            <button
              onClick={() => setCableSheetOpen(true)}
              className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary active:scale-[0.97]"
            >
              Change
              <ChevronRight className="h-3 w-3" />
            </button>
            <button
              onClick={() => setTool("select")}
              aria-label="Cancel cable mode"
              className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground active:scale-[0.97]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-2xl border border-border bg-card/95 p-1.5 shadow-2xl backdrop-blur">
          <ToolButton
            active={tool === "select"}
            icon={<MousePointer2 className="h-5 w-5" />}
            label="Select"
            onClick={() => setTool("select")}
          />
          <ToolButton
            active={tool === "cable"}
            icon={<Cable className="h-5 w-5" />}
            label="Connect"
            onClick={() => setCableSheetOpen(true)}
          />
          <ToolButton
            active={tool === "delete"}
            icon={<Trash2 className="h-5 w-5" />}
            label="Delete"
            onClick={() => setTool("delete")}
          />
          <ToolButton
            active={tool === "ping"}
            icon={<Radar className="h-5 w-5" />}
            label="Inspect"
            onClick={() => setTool("ping")}
          />
          <ToolButton icon={<Plus className="h-5 w-5" />} label="Devices" onClick={() => setDevicesOpen(true)} />
          <ToolButton icon={<Network className="h-5 w-5" />} label="Packet" onClick={() => setPacketOpen(true)} />
          <ToolButton icon={<Menu className="h-5 w-5" />} label="More" onClick={() => setMoreOpen(true)} />
        </div>
      </div>

      <CableSheet open={cableSheetOpen} onOpenChange={setCableSheetOpen} />

      {/* Devices sheet */}
      <BottomSheet
        open={devicesOpen}
        onOpenChange={setDevicesOpen}
        title="Devices"
        description="Tap to add a device at the center of your canvas."
      >
        <div className="grid grid-cols-3 gap-2">
          {DEVICE_ORDER.map((type) => {
            const def = DEVICE_TYPES[type];
            return (
              <button
                key={type}
                onClick={() => useNetlab.getState().addDevice(type)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background/60 px-2 py-3 text-center transition hover:border-primary/40 hover:bg-secondary active:scale-[0.97]"
              >
                <DeviceIcon type={type} className={cn("h-8 w-8", deviceColor(type))} />
                <span className="truncate text-[11px] font-medium leading-tight">{def.label}</span>
                <span className="line-clamp-1 text-[9px] text-muted-foreground">{def.description}</span>
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Packet Lab sheet */}
      <BottomSheet
        open={packetOpen}
        onOpenChange={setPacketOpen}
        title="Packet Lab"
        description="Send packets and diagnose the network, one layer at a time."
        className="h-[85dvh]"
      >
        <TracePanel variant="sheet" />
      </BottomSheet>

      {/* More sheet */}
      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="More" description="Lab tools and file actions.">
        <div className="grid grid-cols-2 gap-2">
          <SheetAction icon={<Undo2 className="h-4 w-4" />} label="Undo" onClick={() => undo()} />
          <SheetAction
            icon={<Save className="h-4 w-4" />}
            label="Save"
            onClick={async () => {
              await useNetlab.getState().saveProject();
              setMoreOpen(false);
            }}
          />
          <SheetAction icon={<FolderOpen className="h-4 w-4" />} label="Projects" onClick={() => { setMoreOpen(false); onOpenProjects(); }} />
          <SheetAction icon={<FlaskConical className="h-4 w-4" />} label="Topologies" onClick={() => { setMoreOpen(false); onOpenTopologies(); }} />
          <SheetAction icon={<Download className="h-4 w-4" />} label="Export JSON" onClick={() => { useNetlab.getState().exportJson(); setMoreOpen(false); }} />
          <SheetAction icon={<Upload className="h-4 w-4" />} label="Import JSON" onClick={() => { setMoreOpen(false); onImport(); }} />
          <SheetAction icon={<Sparkles className="h-4 w-4" />} label="New canvas" onClick={() => { useNetlab.getState().newCanvas(); setMoreOpen(false); }} />
          <SheetAction
            icon={<Grid3x3 className="h-4 w-4" />}
            label={gridSnap ? "Snap: on" : "Snap: off"}
            onClick={() => setGridSnap(!gridSnap)}
          />
          <SheetAction
            icon={mode === "mission" ? <Target className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
            label={mode === "mission" ? "Mission mode" : "Sandbox mode"}
            onClick={() => {
              setMode(mode === "mission" ? "sandbox" : "mission");
              setMoreOpen(false);
            }}
          />
          <SheetAction icon={<Layers className="h-4 w-4" />} label="Choose mission…" onClick={() => { setMoreOpen(false); setMissionPickerOpen(true); }} />
        </div>
      </BottomSheet>
    </>
  );
}

function ToolButton({ active, icon, label, onClick }: { active?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {icon}
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </button>
  );
}

function SheetAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3 py-3 text-left text-sm font-medium transition hover:border-primary/40 hover:bg-secondary"
    >
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}
