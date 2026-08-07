import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { submitNetMission } from "@/lib/net/progress";
import type { SimSnapshot } from "@/lib/net/types";

const submitSchema = z
  .object({
    snapshot: z.object({ version: z.literal(1), devices: z.array(z.record(z.string(), z.unknown())), cables: z.array(z.record(z.string(), z.unknown())) }).passthrough(),
  })
  .strict();

export const POST = handle(async (req, ctx) => {
  const session = await requireSession();
  const { slug } = await ctx.params;
  const parsed = submitSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError("Invalid network snapshot", 400);
  return submitNetMission(session.id, slug, parsed.data.snapshot as unknown as SimSnapshot);
});
