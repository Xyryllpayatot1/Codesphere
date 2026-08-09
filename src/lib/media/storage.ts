/*
 * CodeSphere
 * Copyright © 2026 Jhon Xyryll Samoy
 * All rights reserved.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Release cover image storage.
//
// Uploads are validated on the server (extension whitelist + content sniffing +
// size limit), then re-encoded with sharp to a single capped WebP. Nothing the
// client sends is trusted; the stored bytes are always the sharp output, so an
// attacker can never plant an executable payload.
// ---------------------------------------------------------------------------

/** Max accepted upload size (raw upload). 8 MB. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Capped output dimensions — landscape 16:9-friendly, large enough for any hero. */
export const COVER_MAX_WIDTH = 1920;
export const COVER_MAX_HEIGHT = 1080;
export const COVER_QUALITY = 82;

export const ACCEPTED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const ACCEPTED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export type ProcessedCoverImage = {
  /** Re-encoded bytes (always WebP). */
  buffer: Buffer;
  /** Always "image/webp". */
  mimeType: string;
  width: number;
  height: number;
  size: number;
};

function uploadsDir(): string {
  return path.join(process.cwd(), ".data", "uploads");
}

export function coverFilePath(assetId: string): string {
  return path.join(uploadsDir(), `${assetId}.webp`);
}

/** Magic-byte sniff — never trust the extension or the declared MIME type. */
function sniffImage(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mimeType === "image/gif") {
    return buffer.length >= 4 && buffer.subarray(0, 3).toString("ascii") === "GIF";
  }
  return false;
}

/**
 * Validate and process a release cover image. Throws a plain Error with a
 * user-facing message on any invalid input.
 */
export async function processReleaseCover(file: File): Promise<ProcessedCoverImage> {
  const mime = file.type;
  if (!ACCEPTED_IMAGE_MIME.has(mime)) {
    throw new Error("Unsupported file type. Use a PNG, JPEG, WebP or GIF image.");
  }
  const name = (file.name ?? "").toLowerCase();
  if (![...ACCEPTED_EXTENSIONS].some((ext) => name.endsWith(ext))) {
    throw new Error("Unsupported file extension.");
  }
  if (file.size === 0) throw new Error("The uploaded file is empty.");
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image is too large. Maximum size is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) throw new Error("The uploaded file is empty.");
  if (!sniffImage(buffer, mime)) {
    throw new Error("The file content does not match a supported image.");
  }

  try {
    const result = await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({
        width: COVER_MAX_WIDTH,
        height: COVER_MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: COVER_QUALITY })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      mimeType: "image/webp",
      width: result.info.width,
      height: result.info.height,
      size: result.info.size,
    };
  } catch {
    throw new Error("Could not process this image.");
  }
}

export function writeImage(assetId: string, buffer: Buffer): void {
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(coverFilePath(assetId), buffer);
}

export function readImage(assetId: string): Buffer | null {
  try {
    return fs.readFileSync(coverFilePath(assetId));
  } catch {
    return null;
  }
}

export function deleteImage(assetId: string): void {
  try {
    fs.unlinkSync(coverFilePath(assetId));
  } catch {
    // File already gone — nothing to clean up.
  }
}
