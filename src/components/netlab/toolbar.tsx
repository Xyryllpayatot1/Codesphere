"use client";

import { useState } from "react";
import {
  MousePointer2,
  Cable,
  Trash2,
  Radar,
  Undo2,
  Save,
  Download,
  Upload,
  FolderOpen,
  FlaskConical,
  Target,
  Grid3x3,
  Layers,
  Rocket,
  Sparkles,
  Menu,
} from "lucide-react";
import { useNetlab, type NetTool } from "./netlab-store";
import { CableChooser } from "./cable-menu";
import { cn } from "@/lib/utils";

const TOOLS: { key: NetTool; label: string; icon: React.ReactNode }[] = [
  { key: "select", label: "Select / Move", icon: <MousePointer2 className="h-4 w-4" /> },
  { key: "cable", label: "Cable", icon: <Cable className="h-4 w-4" /> },
  { key: "delete", label: "Delete", icon: <Trash2 className="h-4 w-4" /> },
  { key: "ping", label: "Ping", icon: <Radar className="h-4 w-4" /> },
];

export function Toolbar({ onOpenTopologies, onOpenProjects }: { onOpenTopologies: () => void; onOpenProjects: () => void }) {
  const state = useNetlab();
  const {
    tool,
    setTool,
    cableFrom,
    disarmCable,
    undo,
    saveProject,
    exportJson,
    importJson,
    newCanvas,
    projectTitle,
    dirty,
    mode,
    setMode,
    gridSnap,
    setGridSnap,
    missionSlug,
    missionPanelOpen,
    toggleMissionPanel,
    setMissionPickerOpen,
    setLearn,
  } = state;
  const [moreOpen, setMoreOpen] = useState(false);

  const onImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => importJson(String(reader.result ?? ""));
      reader.readAsText(file);
    };
    input.click();
  };

  const switchMode = (m: typeof mode) => {
    setMode(m);
    if (m === "sandbox") {
      setLearn({
        title: "Sandbox mode",
        body: "No objectives and no XP — build whatever you like. Every device and cable is unlimited.",
        kind: "info",
      });
    } else if (!missionSlug) {
      setMissionPickerOpen(true);
    }
  };

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl border border-border bg-card/90 p-1.5 shadow-xl backdrop-blur">
      {/* mode toggle */}
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-background/60 p-0.5">
        <button
          onClick={() => switchMode("mission")}
          title="Mission mode — follow objectives and earn XP"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition",
            mode === "mission" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Target className="h-3.5 w-3.5" />
          Mission
        </button>
        <button
          onClick={() => switchMode("sandbox")}
          title="Sandbox mode — free building, no XP"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition",
            mode === "sandbox" ? "bg-cyan-500 text-cyan-950 shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Rocket className="h-3.5 w-3.5" />
          Sandbox
        </button>
      </div>

      <span className="pointer-events-auto mx-0.5 h-6 w-px bg-border" />

      {/* tools */}
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-background/60 p-0.5">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTool(t.key)}
            title={t.label}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition",
              tool === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* cable chooser */}
      <div className="pointer-events-auto">
        <CableChooser />
      </div>

      {cableFrom && (
        <button
          onClick={disarmCable}
          className="pointer-events-auto rounded-md bg-cyan-500/15 px-2 py-1.5 text-xs font-medium text-cyan-500 transition hover:bg-cyan-500/25"
        >
          Cancel
        </button>
      )}

      <span className="pointer-events-auto mx-0.5 h-6 w-px bg-border" />

      <div className="pointer-events-auto flex items-center gap-0.5">
        <button
          onClick={undo}
          title="Undo (Ctrl+Z)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => setGridSnap(!gridSnap)}
          title="Toggle grid snapping"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition",
            gridSnap ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Grid3x3 className="h-4 w-4" />
        </button>
        {mode === "mission" && (
          <button
            onClick={toggleMissionPanel}
            title="Mission objectives"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition",
              missionPanelOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Layers className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => setMissionPickerOpen(true)}
          title="Choose a mission or template"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>

      {/* more actions */}
      <div className="pointer-events-auto relative">
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          title="More actions"
        >
          <Menu className="h-4 w-4" />
        </button>
        {moreOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
            <div className="absolute right-0 top-full z-40 mt-1.5 w-52 rounded-xl border border-border bg-card p-1.5 shadow-2xl">
              <MoreItem
                icon={<Save className="h-4 w-4" />}
                label="Save"
                disabled={!dirty}
                onClick={async () => {
                  await saveProject();
                  setMoreOpen(false);
                }}
              />
              <MoreItem icon={<FolderOpen className="h-4 w-4" />} label="Projects…" onClick={() => { setMoreOpen(false); onOpenProjects(); }} />
              <MoreItem icon={<FlaskConical className="h-4 w-4" />} label="Topologies…" onClick={() => { setMoreOpen(false); onOpenTopologies(); }} />
              <div className="my-1 h-px bg-border" />
              <MoreItem icon={<Download className="h-4 w-4" />} label="Export JSON" onClick={() => { exportJson(); setMoreOpen(false); }} />
              <MoreItem icon={<Upload className="h-4 w-4" />} label="Import JSON" onClick={() => { setMoreOpen(false); onImport(); }} />
              <div className="my-1 h-px bg-border" />
              <MoreItem icon={<Sparkles className="h-4 w-4" />} label="New blank network" onClick={() => { newCanvas(); setMoreOpen(false); }} />
              <div className="mt-1 flex items-center justify-between rounded-lg bg-secondary/60 px-2 py-1">
                <span className="max-w-[110px] truncate text-[10px] text-muted-foreground" title={projectTitle}>{projectTitle}</span>
                {dirty && <span className="text-[9px] font-semibold text-amber-500">unsaved</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MoreItem({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:opacity-40"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  );
}
