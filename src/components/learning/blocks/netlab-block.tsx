"use client";

import Link from "next/link";
import { Network, ExternalLink } from "lucide-react";
import type { ContentBlock } from "@/lib/content/types";
import { NetLab } from "@/components/netlab/netlab";

type NetLabBlockData = Extract<ContentBlock, { type: "netlab" }>;

export function NetLabBlock({ block }: { block: NetLabBlockData }) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Network className="h-4 w-4 text-primary" />
          {block.title ?? "Networking Lab"}
        </p>
        <Link
          href="/networking"
          className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          Open full lab <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="h-[560px] bg-background">
        <NetLab initial={{ template: block.template ?? "empty", missionSlug: block.missionSlug ?? null }} />
      </div>
    </div>
  );
}
