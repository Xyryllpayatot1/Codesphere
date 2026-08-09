import { handle, ApiError, readJson } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import {
  closeRoom,
  kickMember,
  renameRoom,
  setMemberRole,
  setRoomLocked,
} from "@/lib/rooms/service";
import { roomHub } from "@/lib/rooms/hub";
import { parseRole, parseRoomEvent } from "@/lib/rooms/validate";

type HostAction = {
  action: "rename" | "lock" | "unlock" | "reset" | "save" | "kick" | "role" | "close";
  name?: string;
  userId?: string;
  role?: unknown;
  snapshot?: unknown;
};

export const POST = handle(async (req: Request, { params }) => {
  const session = await requireSession();
  const { code } = await params;
  const body = await readJson<HostAction>(req);

  const room = await roomHub.session(code);
  if (!room) throw new ApiError("Room not found", 404);
  if (room.hostId !== session.id) throw new ApiError("Only the host can do that", 403);
  if (room.closed) throw new ApiError("Room is closed", 410);

  switch (body.action) {
    case "rename": {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
      if (!name) throw new ApiError("Name is required");
      await renameRoom(code, name);
      room.rename(name);
      return { ok: true, name };
    }
    case "lock": {
      await setRoomLocked(code, true);
      room.setLocked(true);
      return { ok: true, isLocked: true };
    }
    case "unlock": {
      await setRoomLocked(code, false);
      room.setLocked(false);
      return { ok: true, isLocked: false };
    }
    case "reset": {
      const parsed = parseRoomEvent({ type: "TOPOLOGY_RESET", snapshot: body.snapshot });
      if (!parsed.ok) throw new ApiError(`Invalid snapshot: ${parsed.error}`, 422);
      room.publish(session.id, parsed.event);
      await room.save("reset", session.id);
      return { ok: true };
    }
    case "save": {
      await room.save("manual", session.id);
      return { ok: true };
    }
    case "kick": {
      if (typeof body.userId !== "string" || !body.userId) throw new ApiError("userId is required");
      if (body.userId === room.hostId) throw new ApiError("Cannot kick the host");
      await kickMember(code, body.userId);
      room.kick(body.userId);
      return { ok: true };
    }
    case "role": {
      if (typeof body.userId !== "string" || !body.userId) throw new ApiError("userId is required");
      const parsedRole = parseRole(body.role);
      if (!parsedRole.ok) throw new ApiError(parsedRole.error);
      if (body.userId === room.hostId) throw new ApiError("Cannot change the host's role");
      await setMemberRole(code, body.userId, parsedRole.role);
      room.setRole(body.userId, parsedRole.role);
      return { ok: true };
    }
    case "close": {
      await room.save("close", session.id);
      await closeRoom(code);
      await room.close();
      roomHub.drop(code);
      return { ok: true };
    }
    default:
      throw new ApiError("Unknown action", 422);
  }
});
