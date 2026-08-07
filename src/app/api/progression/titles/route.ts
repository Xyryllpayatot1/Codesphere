import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { loadUserTitles, equipTitle } from "@/lib/engine/titles";

const equipSchema = z.object({ titleKey: z.string().min(1).nullable() });

export const GET = handle(async () => {
  const session = await requireSession();
  return loadUserTitles(session.id);
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  const parsed = equipSchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError("Invalid request", 400);

  const equipped = await equipTitle(session.id, parsed.data.titleKey);
  return { equipped };
});
