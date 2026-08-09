import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { createNetProject, listNetProjects } from "@/lib/net/progress";

const createSchema = z
  .object({
    title: z.string().min(1).max(120),
    missionSlug: z.string().max(80).optional().nullable(),
    snapshot: z.object({ version: z.literal(1), devices: z.array(z.record(z.string(), z.unknown())), cables: z.array(z.record(z.string(), z.unknown())) }).passthrough(),
  })
  .strict();

export const GET = handle(async () => {
  const session = await requireSession();
  return listNetProjects(session.id);
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  const parsed = createSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError("Invalid project data", 400);
  const { title, snapshot, missionSlug } = parsed.data;
  return createNetProject(session.id, { title, snapshot, missionSlug });
});
