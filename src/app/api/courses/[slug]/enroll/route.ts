import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ENROLLMENT_STATUS } from "@/lib/constants";

export const POST = handle(async (_req, ctx) => {
  const session = await requireSession();
  const { slug } = await ctx.params;

  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, status: true, isFree: true },
  });
  if (!course || course.status !== "PUBLISHED") throw new ApiError("Course not found", 404);

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: session.id, courseId: course.id } },
    create: { userId: session.id, courseId: course.id, status: ENROLLMENT_STATUS.ACTIVE },
    update: { status: ENROLLMENT_STATUS.ACTIVE, updatedAt: new Date() },
  });

  return { enrolled: true, enrollment };
});
