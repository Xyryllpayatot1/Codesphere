import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { handle } from "@/lib/api";
import { recordStudyTime } from "@/lib/services/progress";

const bodySchema = z.object({
  seconds: z.number().int().min(1).max(3600),
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
});

// Flushed by the lesson page's study tracker (sendBeacon). Advances the daily
// streak once per day and records a StudySession.
export const POST = handle(async (req) => {
  const session = await requireSession();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return { acknowledged: false };
  const { seconds, courseId, lessonId } = parsed.data;
  const result = await recordStudyTime(session.id, "lesson", seconds, courseId, lessonId);
  return { acknowledged: true, streakChanged: result.streakChanged, streak: result.streak?.streak ?? null };
});
