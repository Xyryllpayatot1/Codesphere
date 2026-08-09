import { handle, ApiError } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { leaveRoom, closeRoom } from "@/lib/rooms/service";
import { roomHub } from "@/lib/rooms/hub";

export const POST = handle(async (_req: Request, { params }) => {
  const session = await requireSession();
  const { code } = await params;
  const room = await leaveRoom(code, session.id);
  if (!room) throw new ApiError("Room not found", 404);

  const roomSession = await roomHub.session(code);
  if (roomSession) {
    if (roomSession.hostId === session.id) {
      // Host leaving closes the room for everyone.
      await roomSession.close();
      await closeRoom(code);
      roomHub.drop(code);
    } else {
      roomSession.removeMember(session.id);
    }
  }
  return { left: true };
});
