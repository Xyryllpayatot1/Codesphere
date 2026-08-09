import { handle, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { unpublishRelease } from "@/lib/services/releases";

export const dynamic = "force-dynamic";

export const POST = handle(async (_req: Request, ctx) => {
  await requireRole(ROLES.ADMIN);
  const { id } = await ctx.params;
  const release = await unpublishRelease(id);
  if (!release) throw new ApiError("Release not found", 404);
  return release;
});
