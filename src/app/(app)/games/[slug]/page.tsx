import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { loadGameDetail } from "@/lib/games/progress";
import { GameDetail } from "@/components/games/game-detail";

export const dynamic = "force-dynamic";

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireSession();
  const { slug } = await params;
  const data = await loadGameDetail(session.id, slug);
  if (!data.game) notFound();

  return (
    <div className="space-y-6">
      <GameDetail
        game={data.game}
        levels={data.levels.map((l) => ({ ...l, completedAt: l.completedAt ? l.completedAt.toISOString() : null }))}
        unlocked={data.unlocked}
        unlockReason={data.unlockReason}
      />
    </div>
  );
}
