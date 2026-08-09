import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readImage } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

// Serves a processed release cover. Public (no auth) — the URL is a random
// opaque id and the bytes are always the sharp-re-encoded WebP.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true, mimeType: true } });
  if (!asset) return new NextResponse("Not found", { status: 404 });
  const bytes = readImage(id);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  const body = Uint8Array.from(bytes);
  return new NextResponse(body, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
