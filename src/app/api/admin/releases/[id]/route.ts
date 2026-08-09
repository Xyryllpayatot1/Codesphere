import { handle, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getReleaseForAdmin, updateRelease, deleteRelease } from "@/lib/services/releases";
import { releaseInputSchema } from "@/lib/releases/schemas";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, ctx) => {
  await requireRole(ROLES.ADMIN);
  const { id } = await ctx.params;
  const release = await getReleaseForAdmin(id);
  if (!release) throw new ApiError("Release not found", 404);
  return release;
});

export const PATCH = handle(async (req: Request, ctx) => {
  await requireRole(ROLES.ADMIN);
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) throw new ApiError("Invalid JSON body", 400);
  const parsed = releaseInputSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("Invalid release", 422, parsed.error.flatten());
  const release = await updateRelease(id, parsed.data);
  if (!release) throw new ApiError("Release not found", 404);
  return release;
});

export const DELETE = handle(async (_req: Request, ctx) => {
  await requireRole(ROLES.ADMIN);
  const { id } = await ctx.params;
  await deleteRelease(id);
  return { deleted: true };
});
