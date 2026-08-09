import "server-only";

import { requireSession } from "@/lib/auth";
import { getRoomMembers } from "@/lib/rooms/service";
import { roomHub, type Subscriber } from "@/lib/rooms/hub";
import type { RoomMemberInfo, RoomServerMessage } from "@/lib/rooms/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "content-type": "application/json" } });
  }
  const { code } = await params;

  const room = await roomHub.session(code);
  if (!room) {
    return new Response(JSON.stringify({ error: "Room not found" }), { status: 404, headers: { "content-type": "application/json" } });
  }

  const rows = await getRoomMembers(room.roomId);
  const me = rows.find((r) => r.userId === session.id);
  if (!me) {
    return new Response(JSON.stringify({ error: "You are not a member of this room" }), { status: 403, headers: { "content-type": "application/json" } });
  }

  const member: RoomMemberInfo = {
    userId: me.userId,
    name: me.name,
    username: me.username,
    avatarUrl: me.avatarUrl,
    role: me.role,
    status: "online",
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (msg: RoomServerMessage) => {
        let id = "";
        if (msg.type === "ROOM_SYNC") id = String(msg.seq);
        else if (msg.type === "EVENT") id = String(msg.seq);
        else if (msg.type === "REPLAY" && msg.events.length > 0) id = String(msg.events[msg.events.length - 1].seq);
        controller.enqueue(encoder.encode(`${id ? `id: ${id}\n` : ""}data: ${JSON.stringify(msg)}\n\n`));
      };
      const sub: Subscriber = { userId: session!.id, send };

      if (!room.connect(member, sub)) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "ROOM_CLOSED" })}\n\n`));
        } catch {
          /* noop */
        }
        controller.close();
        return;
      }

      // Reconnecting clients pass the last seq they saw; replay the gap.
      // `?resync=1` forces a full snapshot (used after a rejected edit).
      const url = new URL(req.url);
      const forceSync = url.searchParams.get("resync") === "1";
      const lastEventId = req.headers.get("last-event-id");
      if (!forceSync && lastEventId != null && /^\d+$/.test(lastEventId)) {
        room.replaySince(sub, Number(lastEventId));
      } else {
        send(room.syncMessage());
      }

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        room.disconnect(session!.id, sub);
        try {
          controller.close();
        } catch {
          /* noop */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
