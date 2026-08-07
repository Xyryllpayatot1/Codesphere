import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { deleteNetProject, getNetProject, updateNetProject } from "@/lib/net/progress";

const updateSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    isArchived: z.boolean().optional(),
    snapshot: z.object({ version: z.literal(1), devices: z.array(z.record(z.string(), z.unknown())), cables: z.array(z.record(z.string(), z.unknown())) }).passthrough().optional(),
  })
  .strict();

export const GET = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const project = await getNetProject(session.id, id);
  if (!project) throw new ApiError("Project not found", 404);
  return project;
});

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const parsed = updateSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError("Invalid project update", 400);
  const project = await updateNetProject(session.id, id, parsed.data);
  if (!project) throw new ApiError("Project not found", 404);
  return project;
});

export const DELETE = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const ok = await deleteNetProject(session.id, id);
  if (!ok) throw new ApiError("Project not found", 404);
  return { deleted: true };
});
