import { handle, ApiError } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getRoomMembers } from "@/lib/rooms/service";
import { roomHub } from "@/lib/rooms/hub";
import { parseRoomEvent } from "@/lib/rooms/validate";
import type { RoomRole } from "@/lib/rooms/types";

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const EDIT_EVENT_TYPES = new Set([
  "DEVICE_CREATED",
  "DEVICE_MOVED",
  "DEVICE_DELETED",
  "DEVICE_UPDATED",
  "INTERFACE_UPDATED",
  "DEVICE_POWER_CHANGED",
  "CABLE_CREATED",
  "CABLE_REMOVED",
  "WORKSPACE_SYNC",
  "TOPOLOGY_RESET",
]);

export const POST = handle(async (req: Request, { params }) => {
  const session = await requireSession();
  const { code } = await params;

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) throw new ApiError("Event too large", 413);

  const room = await roomHub.session(code);
  if (!room) throw new ApiError("Room not found", 404);
  if (room.closed) throw new ApiError("Room is closed", 410);

  let role = room.members.get(session.id)?.role as RoomRole | undefined;
  if (!role) {
    const rows = await getRoomMembers(room.roomId);
    role = rows.find((r) => r.userId === session.id)?.role;
  }
  if (!role) throw new ApiError("You are not a member of this room", 403);

  const body = (await req.json().catch(() => null)) as { event?: unknown } | null;
  if (!body) throw new ApiError("Invalid JSON body");
  const parsed = parseRoomEvent(body.event);
  if (!parsed.ok) throw new ApiError(`Invalid event: ${parsed.error}`, 422);

  const event = parsed.event;
  if (EDIT_EVENT_TYPES.has(event.type)) {
    if (role === "VIEWER") throw new ApiError("Viewers cannot modify the workspace", 403);
    if (room.isLocked && role !== "HOST") throw new ApiError("Editing is locked by the host", 403);
  }
  if (event.type === "TOPOLOGY_RESET" && role !== "HOST") {
    throw new ApiError("Only the host can reset the workspace", 403);
  }

  const result = room.publish(session.id, event);
  if (!result) throw new ApiError("Room is closed", 410);
  return result;
});
