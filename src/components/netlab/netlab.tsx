"use client";

import { useEffect, useRef, useState } from "react";
import { UsersRound } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { Canvas } from "./canvas";
import { Palette } from "./palette";
import { Toolbar } from "./toolbar";
import { MobileLabBar } from "./mobile-lab-bar";
import { TracePanel } from "./trace-panel";
import { MissionPanel } from "./mission-panel";
import { MissionPicker } from "./mission-picker";
import { DeviceConfigWindow } from "./device-config-window";
import { ContextMenu } from "./context-menu";
import { LearnNote } from "./learn-note";
import { CmdLog } from "./cmd-log";
import { TopologyDialog, ProjectsDialog } from "./projects-dialog";
import { CollabDialog } from "./collab-dialog";
import { CollabPanel } from "./collab-panel";

export type NetLabInitial = {
  template?: "empty" | "small-lan" | "two-router" | "wifi" | "internet";
  missionSlug?: string | null;
};

export function NetLab({ initial, roomCode }: { initial?: NetLabInitial; roomCode?: string }) {
  const [showTopologies, setShowTopologies] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const checkMission = useNetlab((s) => s.checkMission);
  const missionSlug = useNetlab((s) => s.missionSlug);
  const mode = useNetlab((s) => s.mode);
  const version = useNetlab((s) => s.version);
  const simDeviceCount = useNetlab((s) => s.sim.devices.length);
  const setMissionPickerOpen = useNetlab((s) => s.setMissionPickerOpen);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (!initial) return;
    if (initial.missionSlug) {
      useNetlab.getState().startMission(initial.missionSlug);
    } else if (initial.template && initial.template !== "empty") {
      useNetlab.getState().loadTemplate(initial.template);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (missionSlug) checkMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, missionSlug]);

  useEffect(() => {
    if (mode === "mission" && !missionSlug && simDeviceCount === 0) {
      setMissionPickerOpen(true);
    }
  }, [mode, missionSlug, simDeviceCount, setMissionPickerOpen]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:block">
          <Palette />
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <div className="hidden lg:block">
              <Toolbar onOpenTopologies={() => setShowTopologies(true)} onOpenProjects={() => setShowProjects(true)} />
            </div>
            <Canvas />
            <MissionPanel />
            <LearnNote />
            <ContextMenu />
            <MobileLabBar onOpenTopologies={() => setShowTopologies(true)} onOpenProjects={() => setShowProjects(true)} />
            {!roomCode && (
              <button
                onClick={() => setCollabOpen(true)}
                className="absolute right-3 top-3 z-40 flex items-center gap-1.5 rounded-xl border border-border bg-card/90 px-3 py-2 text-xs font-semibold text-muted-foreground shadow-xl backdrop-blur transition hover:bg-card hover:text-foreground"
                title="Collaborate with friends in real time"
              >
                <UsersRound className="h-4 w-4 text-primary" />
                Collaborate
              </button>
            )}
            {roomCode && <CollabPanel code={roomCode} />}
          </div>
          <div className="hidden lg:block">
            <TracePanel />
          </div>
          <div className="hidden lg:block">
            <CmdLog />
          </div>
        </div>
      </div>
      <DeviceConfigWindow />
      <MissionPicker />
      <TopologyDialog open={showTopologies} onOpenChange={setShowTopologies} />
      <ProjectsDialog open={showProjects} onOpenChange={setShowProjects} />
      <CollabDialog open={collabOpen} onOpenChange={setCollabOpen} />
    </div>
  );
}
