import { handle, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { publishRelease } from "@/lib/services/releases";

export const dynamic = "force-dynamic";

export const POST = handle(async (_req: Request, ctx) => {
  await requireRole(ROLES.ADMIN);
  const { id } = await ctx.params;
  const release = await publishRelease(id);
  if (!release) throw new ApiError("Release not found", 404);
  return release;
});
