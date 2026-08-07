import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { submitProject } from "@/lib/services/projects";

const bodySchema = z.object({
  code: z.string().min(1).max(100_000),
  description: z.string().max(2000).optional(),
});

export const POST = handle(async (req, ctx) => {
  const session = await requireSession();
  const { slug } = await ctx.params;

  const project = await prisma.project.findFirst({
    where: { slug, isPublished: true },
    select: { id: true, isPublished: true },
  });
  if (!project) throw new ApiError("Project not found", 404);

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError("Invalid submission", 400);

  const result = await submitProject(session.id, project.id, parsed.data.code, parsed.data.description);
  return result;
});
