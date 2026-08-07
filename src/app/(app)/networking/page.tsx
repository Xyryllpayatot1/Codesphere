import { requireSession } from "@/lib/auth";
import { loadNetMissionCatalog } from "@/lib/net/progress";
import { NetLab } from "@/components/netlab/netlab";
import { Network } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NetworkingPage() {
  const session = await requireSession();
  const { stats } = await loadNetMissionCatalog(session.id);

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] flex-col lg:-m-8">
      <div className="flex items-center gap-3 border-b border-border bg-background/70 px-4 py-2.5 backdrop-blur">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
          <Network className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">Networking Lab</h1>
          <p className="truncate text-xs text-muted-foreground">
            Design networks, trace packets, and fix them — one layer at a time.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(stats.completed / Math.max(1, stats.total)) * 100}%` }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {stats.completed}/{stats.total} missions
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <NetLab />
      </div>
    </div>
  );
}
