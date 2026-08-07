import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { PLAN_ITEM_STATUS } from "@/lib/constants";

// Marks a study-plan item as DONE (or back to PENDING). Ownership is enforced.

export const PATCH = handle(async (req, ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;

  const item = await prisma.studyPlanItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.id) throw new ApiError("Plan item not found", 404);

  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status === PLAN_ITEM_STATUS.PENDING ? PLAN_ITEM_STATUS.PENDING : PLAN_ITEM_STATUS.DONE;

  const updated = await prisma.studyPlanItem.update({ where: { id }, data: { status } });
  return { id: updated.id, status: updated.status };
});
