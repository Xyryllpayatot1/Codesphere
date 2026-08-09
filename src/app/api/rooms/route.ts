import { handle } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { createRoom, listRoomsForUser } from "@/lib/rooms/service";
import { roomHub } from "@/lib/rooms/hub";

export const POST = handle(async (req: Request) => {
  const session = await requireSession();
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  const { code, roomId } = await createRoom(session.id, name);
  roomHub.register({
    code,
    roomId,
    name: name.trim() || "Untitled Room",
    hostId: session.id,
    kind: "networking",
    isLocked: false,
    revision: 0,
  });
  return { code, roomId, role: "HOST", name: name.trim() || "Untitled Room" };
});

export const GET = handle(async () => {
  const session = await requireSession();
  return listRoomsForUser(session.id);
});
