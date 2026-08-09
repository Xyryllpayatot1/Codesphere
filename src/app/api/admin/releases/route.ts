import { handle, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { createRelease, listReleasesForAdmin } from "@/lib/services/releases";
import { releaseInputSchema } from "@/lib/releases/schemas";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireRole(ROLES.ADMIN);
  return listReleasesForAdmin();
});

export const POST = handle(async (req: Request) => {
  await requireRole(ROLES.ADMIN);
  const body = await req.json().catch(() => null);
  if (!body) throw new ApiError("Invalid JSON body", 400);
  const parsed = releaseInputSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("Invalid release", 422, parsed.error.flatten());
  return createRelease(parsed.data);
});
