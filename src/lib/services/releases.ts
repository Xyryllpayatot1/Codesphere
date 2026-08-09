/*
 * CreyvaPH
 * Copyright © 2026 Jhon Xyryll Samoy
 * All rights reserved.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { processReleaseCover, writeImage, deleteImage } from "@/lib/media/storage";
import type { ReleaseInput } from "@/lib/releases/schemas";

// ---------------------------------------------------------------------------
// Release / What's New service. The Release + ReleaseChange + UserReleaseView +
// MediaAsset tables were designed in the schema; this module is their first
// real implementation.
// ---------------------------------------------------------------------------

export type ReleaseCoverAsset = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type ReleaseChangeRow = {
  id: string;
  type: string;
  title: string;
  description: string;
  order: number;
};

export type ReleaseSummary = {
  id: string;
  version: string;
  title: string;
  summary: string;
  description: string;
  releaseDate: Date;
  isPublished: boolean;
  publishedAt: Date | null;
  coverImage: ReleaseCoverAsset | null;
};

export type ReleaseDetail = ReleaseSummary & {
  changes: ReleaseChangeRow[];
};

type CoverRow = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
} | null;

type SummaryRow = {
  id: string;
  version: string;
  title: string;
  summary: string;
  description: string;
  releaseDate: Date;
  isPublished: boolean;
  publishedAt: Date | null;
  coverImage: CoverRow;
};

type DetailRow = SummaryRow & {
  changes: { id: string; type: string; title: string; description: string; order: number }[];
};

const coverSelect = { id: true, url: true, filename: true, mimeType: true, size: true } as const;
const detailInclude = { coverImage: { select: coverSelect }, changes: { orderBy: { order: "asc" } } } as const;

function toSummary(r: SummaryRow): ReleaseSummary {
  return {
    id: r.id,
    version: r.version,
    title: r.title,
    summary: r.summary,
    description: r.description,
    releaseDate: r.releaseDate,
    isPublished: r.isPublished,
    publishedAt: r.publishedAt,
    coverImage: r.coverImage,
  };
}

function toDetail(r: DetailRow): ReleaseDetail {
  return {
    ...toSummary(r),
    changes: r.changes.map((c) => ({ ...c })),
  };
}

// ─────────────────────────────────── reads ──────────────────────────────────

export async function listPublishedReleases(): Promise<ReleaseSummary[]> {
  const rows = await prisma.release.findMany({
    where: { isPublished: true },
    orderBy: { releaseDate: "desc" },
    include: { coverImage: { select: coverSelect } },
  });
  return rows.map(toSummary);
}

export async function getLatestPublishedRelease(): Promise<ReleaseSummary | null> {
  const row = await prisma.release.findFirst({
    where: { isPublished: true },
    orderBy: { releaseDate: "desc" },
    include: { coverImage: { select: coverSelect } },
  });
  return row ? toSummary(row) : null;
}

export async function listReleasesForAdmin(): Promise<ReleaseDetail[]> {
  const rows = await prisma.release.findMany({
    orderBy: { releaseDate: "desc" },
    include: detailInclude,
  });
  return rows.map(toDetail);
}

export async function getPublishedRelease(id: string): Promise<ReleaseDetail | null> {
  const row = await prisma.release.findFirst({
    where: { id, isPublished: true },
    include: detailInclude,
  });
  return row ? toDetail(row) : null;
}

export async function getReleaseForAdmin(id: string): Promise<ReleaseDetail | null> {
  const row = await prisma.release.findUnique({
    where: { id },
    include: detailInclude,
  });
  return row ? toDetail(row) : null;
}

// ────────────────────────────────── writes ──────────────────────────────────

async function assertVersionFree(version: string, exceptId?: string): Promise<void> {
  const existing = await prisma.release.findUnique({ where: { version }, select: { id: true } });
  if (existing && existing.id !== exceptId) {
    throw new ApiError(`A release with version ${version} already exists`, 409);
  }
}

export async function createRelease(input: ReleaseInput): Promise<ReleaseDetail> {
  await assertVersionFree(input.version);
  const row = await prisma.release.create({
    data: {
      version: input.version,
      title: input.title,
      summary: input.summary,
      description: input.description,
      releaseDate: input.releaseDate ? new Date(input.releaseDate) : new Date(),
      changes: {
        create: input.changes.map((c, i) => ({ type: c.type, title: c.title, description: c.description, order: i })),
      },
    },
    include: detailInclude,
  });
  return toDetail(row);
}

export async function updateRelease(id: string, input: ReleaseInput): Promise<ReleaseDetail | null> {
  const existing = await prisma.release.findUnique({ where: { id } });
  if (!existing) return null;
  await assertVersionFree(input.version, id);
  const row = await prisma.$transaction(async (tx) => {
    await tx.releaseChange.deleteMany({ where: { releaseId: id } });
    return tx.release.update({
      where: { id },
      data: {
        version: input.version,
        title: input.title,
        summary: input.summary,
        description: input.description,
        releaseDate: input.releaseDate ? new Date(input.releaseDate) : existing.releaseDate,
        changes: {
          create: input.changes.map((c, i) => ({ type: c.type, title: c.title, description: c.description, order: i })),
        },
      },
      include: detailInclude,
    });
  });
  return toDetail(row);
}

export async function publishRelease(id: string): Promise<ReleaseDetail | null> {
  const existing = await prisma.release.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.release.update({
    where: { id },
    data: { isPublished: true, publishedAt: existing.publishedAt ?? new Date() },
    include: detailInclude,
  });
  return toDetail(row);
}

export async function unpublishRelease(id: string): Promise<ReleaseDetail | null> {
  const existing = await prisma.release.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.release.update({
    where: { id },
    data: { isPublished: false },
    include: detailInclude,
  });
  return toDetail(row);
}

export async function deleteRelease(id: string): Promise<void> {
  const release = await prisma.release.findUnique({ where: { id }, include: { coverImage: true } });
  if (!release) return;
  await prisma.release.delete({ where: { id } });
  if (release.coverImage) {
    deleteImage(release.coverImage.id);
    await prisma.mediaAsset.delete({ where: { id: release.coverImage.id } }).catch(() => {});
  }
}

/** Upload a new cover for a release, replacing any existing one. */
export async function setReleaseCover(releaseId: string, file: File, uploadedById: string): Promise<ReleaseDetail | null> {
  const release = await prisma.release.findUnique({ where: { id: releaseId }, include: { coverImage: true } });
  if (!release) return null;

  const processed = await processReleaseCover(file);
  const assetId = crypto.randomUUID();
  writeImage(assetId, processed.buffer);

  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        id: assetId,
        filename: file.name,
        url: `/api/media/${assetId}`,
        mimeType: processed.mimeType,
        size: processed.size,
        uploadedById,
      },
    });
    const updated = await prisma.release.update({
      where: { id: releaseId },
      data: { coverImageId: asset.id },
      include: detailInclude,
    });
    if (release.coverImage) {
      deleteImage(release.coverImage.id);
      await prisma.mediaAsset.delete({ where: { id: release.coverImage.id } }).catch(() => {});
    }
    return toDetail(updated);
  } catch (err) {
    deleteImage(assetId);
    throw err;
  }
}

export async function clearReleaseCover(releaseId: string): Promise<ReleaseDetail | null> {
  const release = await prisma.release.findUnique({ where: { id: releaseId }, include: { coverImage: true } });
  if (!release) return null;
  const updated = await prisma.release.update({
    where: { id: releaseId },
    data: { coverImageId: null },
    include: detailInclude,
  });
  if (release.coverImage) {
    deleteImage(release.coverImage.id);
    await prisma.mediaAsset.delete({ where: { id: release.coverImage.id } }).catch(() => {});
  }
  return toDetail(updated);
}

// ─────────────────────────────── user read state ────────────────────────────

export async function markReleaseSeen(userId: string, releaseId: string): Promise<void> {
  await prisma.userReleaseView.upsert({
    where: { userId_releaseId: { userId, releaseId } },
    create: { userId, releaseId },
    update: { seenAt: new Date() },
  });
}

export async function isReleaseSeen(userId: string, releaseId: string): Promise<boolean> {
  const view = await prisma.userReleaseView.findUnique({
    where: { userId_releaseId: { userId, releaseId } },
    select: { id: true },
  });
  return Boolean(view);
}
