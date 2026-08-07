"use client";

import { useEffect, useRef, useState } from "react";
import { useNetlab } from "./netlab-store";
import { Canvas } from "./canvas";
import { Palette } from "./palette";
import { Toolbar } from "./toolbar";
import { TracePanel } from "./trace-panel";
import { MissionPanel } from "./mission-panel";
import { MissionPicker } from "./mission-picker";
import { DeviceConfigWindow } from "./device-config-window";
import { ContextMenu } from "./context-menu";
import { LearnNote } from "./learn-note";
import { CmdLog } from "./cmd-log";
import { TopologyDialog, ProjectsDialog } from "./projects-dialog";

export type NetLabInitial = {
  template?: "empty" | "small-lan" | "two-router" | "wifi" | "internet";
  missionSlug?: string | null;
};

export function NetLab({ initial }: { initial?: NetLabInitial }) {
  const [showTopologies, setShowTopologies] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
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
        <Palette />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <Toolbar onOpenTopologies={() => setShowTopologies(true)} onOpenProjects={() => setShowProjects(true)} />
            <Canvas />
            <MissionPanel />
            <LearnNote />
            <ContextMenu />
          </div>
          <TracePanel />
          <CmdLog />
        </div>
      </div>
      <DeviceConfigWindow />
      <MissionPicker />
      <TopologyDialog open={showTopologies} onOpenChange={setShowTopologies} />
      <ProjectsDialog open={showProjects} onOpenChange={setShowProjects} />
    </div>
  );
}
