import { notFound } from "next/navigation";
import { UsersRound } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getRoomByCode, getRoomMembers } from "@/lib/rooms/service";
import { NetLab } from "@/components/netlab/netlab";

export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  await requireSession();
  const { code } = await params;
  const room = await getRoomByCode(code.toUpperCase());
  if (!room || room.status !== "ACTIVE") notFound();

  const members = await getRoomMembers(room.id);
  const online = members.length;

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] flex-col lg:-m-8">
      <div className="flex items-center gap-3 border-b border-border bg-background/70 px-4 py-2.5 backdrop-blur">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
          <UsersRound className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">
            {room.name}
            <span className="ml-2 rounded-md border border-border bg-background/80 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-muted-foreground">
              {room.code}
            </span>
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            Live collaboration room · {online} member{online === 1 ? "" : "s"} · edits sync in real time
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <NetLab roomCode={room.code} />
      </div>
    </div>
  );
}
