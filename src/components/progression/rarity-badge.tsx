import { cn } from "@/lib/utils";
import { RARITY_META, type Rarity } from "@/lib/constants";

export function RarityBadge({ rarity, className }: { rarity: string; className?: string }) {
  const meta = RARITY_META[(rarity as Rarity) in RARITY_META ? (rarity as Rarity) : "COMMON"];
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", className)}
      style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}
