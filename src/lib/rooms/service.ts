// ---------------------------------------------------------------------------
// Collaboration room service — the ONLY room logic that touches the database.
// The realtime bus (RoomHub) is in-memory and coordinates state; this layer
// persists room metadata, members, roles and debounced workspace snapshots.
// ---------------------------------------------------------------------------

import "server-only";

import { prisma } from "@/lib/prisma";
import type { SimSnapshot } from "@/lib/net/types";
import { ROOM_ROLES, type RoomRole } from "./types";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const ROOM_CODE_LENGTH = 5;

export function generateRoomCode(): string {
  const rand = (max: number) => Math.floor(Math.random() * max);
  return Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[rand(ROOM_CODE_ALPHABET.length)]).join("");
}

async function uniqueRoomCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateRoomCode();
    const existing = await prisma.collaborationRoom.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error("Could not allocate a room code — try again");
}

export function emptySnapshot(): SimSnapshot {
  return { version: 1, devices: [], cables: [], macTables: {}, startupConfigs: {}, wirelessLinks: [] };
}

export type RoomMemberRow = {
  userId: string;
  role: RoomRole;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export async function createRoom(hostId: string, name: string): Promise<{ code: string; roomId: string }> {
  const code = await uniqueRoomCode();
  const room = await prisma.collaborationRoom.create({
    data: {
      code,
      name: name.trim() || "Untitled Room",
      hostId,
      kind: "networking",
      revision: 0,
    },
  });
  await prisma.roomMember.create({
    data: { roomId: room.id, userId: hostId, role: ROOM_ROLES.HOST },
  });
  return { code: room.code, roomId: room.id };
}

export async function getRoomByCode(code: string) {
  return prisma.collaborationRoom.findUnique({ where: { code } });
}

export async function getRoomMembers(roomId: string): Promise<RoomMemberRow[]> {
  const rows = await prisma.roomMember.findMany({
    where: { roomId },
    select: {
      role: true,
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });
  return rows.map((r) => ({
    userId: r.user.id,
    role: r.role as RoomRole,
    name: r.user.name,
    username: r.user.username,
    avatarUrl: r.user.avatarUrl,
  }));
}

export async function joinRoom(code: string, userId: string) {
  const room = await prisma.collaborationRoom.findUnique({ where: { code } });
  if (!room) return null;
  if (room.status !== "ACTIVE") return null;
  const member = await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId: room.id, userId } },
    create: { roomId: room.id, userId, role: ROOM_ROLES.COLLABORATOR },
    update: { lastSeenAt: new Date() },
    select: { role: true },
  });
  return { room, role: member.role as RoomRole };
}

export async function leaveRoom(code: string, userId: string) {
  const room = await prisma.collaborationRoom.findUnique({ where: { code } });
  if (!room) return null;
  await prisma.roomMember.deleteMany({ where: { roomId: room.id, userId } });
  return room;
}

export async function closeRoom(code: string) {
  const room = await prisma.collaborationRoom.findUnique({ where: { code } });
  if (!room) return null;
  const updated = await prisma.collaborationRoom.update({ where: { id: room.id }, data: { status: "CLOSED" } });
  return updated;
}

export async function kickMember(code: string, userId: string) {
  const room = await prisma.collaborationRoom.findUnique({ where: { code } });
  if (!room) return null;
  await prisma.roomMember.deleteMany({ where: { roomId: room.id, userId } });
  return room;
}

export async function setMemberRole(code: string, userId: string, role: RoomRole) {
  const room = await prisma.collaborationRoom.findUnique({ where: { code } });
  if (!room) return null;
  await prisma.roomMember.updateMany({ where: { roomId: room.id, userId }, data: { role } });
  return room;
}

export async function renameRoom(code: string, name: string) {
  const room = await prisma.collaborationRoom.findUnique({ where: { code } });
  if (!room) return null;
  return prisma.collaborationRoom.update({ where: { id: room.id }, data: { name: name.trim() || room.name } });
}

export async function setRoomLocked(code: string, isLocked: boolean) {
  const room = await prisma.collaborationRoom.findUnique({ where: { code } });
  if (!room) return null;
  return prisma.collaborationRoom.update({ where: { id: room.id }, data: { isLocked } });
}

export async function saveSnapshot(
  roomId: string,
  revision: number,
  data: unknown,
  reason: "manual" | "autosave" | "close" | "reset",
  savedBy?: string,
) {
  const [snapshot] = await prisma.$transaction([
    prisma.roomSnapshot.create({ data: { roomId, revision, data: data as never, reason, savedBy } }),
    prisma.collaborationRoom.update({ where: { id: roomId }, data: { revision, lastSnapshotAt: new Date() } }),
  ]);
  return snapshot;
}

export async function loadLatestSnapshot(roomId: string) {
  const snapshot = await prisma.roomSnapshot.findFirst({
    where: { roomId },
    orderBy: { revision: "desc" },
    select: { data: true, revision: true },
  });
  if (!snapshot) return null;
  return { snapshot: snapshot.data as SimSnapshot, revision: snapshot.revision };
}

export async function listRoomsForUser(userId: string) {
  return prisma.collaborationRoom.findMany({
    where: { status: "ACTIVE", members: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      code: true,
      name: true,
      hostId: true,
      kind: true,
      status: true,
      revision: true,
      updatedAt: true,
      host: { select: { name: true, username: true } },
      _count: { select: { members: true } },
    },
  });
}

export async function touchLastSeen(roomId: string, userId: string) {
  await prisma.roomMember.updateMany({
    where: { roomId, userId },
    data: { lastSeenAt: new Date() },
  });
}
