import { handle, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { MAX_IMAGE_BYTES, ACCEPTED_IMAGE_MIME } from "@/lib/media/storage";
import { setReleaseCover, clearReleaseCover } from "@/lib/services/releases";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request, ctx) => {
  const session = await requireRole(ROLES.ADMIN);
  const { id } = await ctx.params;

  const form = await req.formData().catch(() => null);
  if (!form) throw new ApiError("Invalid form data", 400);
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("No image file provided", 400);
  if (!ACCEPTED_IMAGE_MIME.has(file.type)) {
    throw new ApiError("Unsupported file type. Use a PNG, JPEG, WebP or GIF image.", 422);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiError(`Image is too large. Maximum size is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`, 422);
  }

  const release = await setReleaseCover(id, file, session.id);
  if (!release) throw new ApiError("Release not found", 404);
  return release;
});

export const DELETE = handle(async (_req: Request, ctx) => {
  await requireRole(ROLES.ADMIN);
  const { id } = await ctx.params;
  const release = await clearReleaseCover(id);
  if (!release) throw new ApiError("Release not found", 404);
  return release;
});
