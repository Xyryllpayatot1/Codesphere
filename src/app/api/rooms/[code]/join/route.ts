import { handle, ApiError } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { joinRoom, getRoomByCode } from "@/lib/rooms/service";

export const POST = handle(async (req: Request, { params }) => {
  const session = await requireSession();
  const { code } = await params;
  const room = await getRoomByCode(code);
  if (!room) throw new ApiError("Room not found", 404);
  const joined = await joinRoom(code, session.id);
  if (!joined) throw new ApiError("Room is not available", 410);
  return {
    code: joined.room.code,
    roomId: joined.room.id,
    name: joined.room.name,
    role: joined.role,
  };
});
