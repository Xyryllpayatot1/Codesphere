"use client";

import { useEffect, useState } from "react";
import { Loader2, FolderOpen, Trash2, Download, FlaskConical } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { TOPOLOGIES } from "@/lib/net/topology";
import { useNetlab } from "./netlab-store";
import { getMission } from "@/lib/net/missions";

export function TopologyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const loadTopology = useNetlab((s) => s.loadTopology);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Topology Library" description="Reference networks you can load and experiment on.">
      <div className="grid gap-2.5">
        {TOPOLOGIES.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              loadTopology(t.id as "star");
              onOpenChange(false);
            }}
            className="group flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3 text-left transition hover:border-primary/40 hover:bg-secondary"
          >
            <span className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary">
              <FlaskConical className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">{t.devices.join(", ")}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t.short}</p>
            </div>
          </button>
        ))}
      </div>
    </Dialog>
  );
}

type ProjectRow = { id: string; title: string; missionSlug: string | null; updatedAt: string; devices: number; cables: number };

export function ProjectsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { loadProject, deleteProject, saveProject } = useNetlab();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/networking/projects");
      if (!res.ok) throw new Error("fetch");
      const data = (await res.json()) as ProjectRow[];
      setProjects(data);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/networking/projects")
      .then((res) => (res.ok ? res.json() : Promise.resolve([])))
      .then((data: ProjectRow[]) => {
        if (alive) setProjects(data);
      })
      .catch(() => {
        if (alive) setProjects([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="My Projects" description="Save your work and come back to it later.">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          onClick={async () => {
            await saveProject();
            refresh();
          }}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Download className="h-3.5 w-3.5" /> Save current network
        </button>
        <span className="text-[11px] text-muted-foreground">{projects.length} saved</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No saved projects yet — build a network and hit Save.</p>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => {
            const m = p.missionSlug ? getMission(p.missionSlug) : null;
            return (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2.5">
                <button onClick={() => { loadProject(p.id); onOpenChange(false); }} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.devices} devices · {p.cables} cables{m ? ` · ${m.title}` : ""} · {new Date(p.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => deleteProject(p.id).then(refresh)}
                  className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}
