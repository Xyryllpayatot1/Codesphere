import { ACTIVITY_TYPES } from "@/lib/constants";

type ActivityRow = {
  type: string;
  data: unknown;
  course: { title: string; slug: string } | null;
  lesson: { title: string; slug: string; moduleSlug: string } | null;
};

export function activityMessage(a: ActivityRow): { title: string; href: string | null } {
  const data = (a.data ?? {}) as Record<string, unknown>;

  const lessonHref = a.lesson && a.course ? `/learn/${a.course.slug}/${a.lesson.moduleSlug}/${a.lesson.slug}` : null;

  switch (a.type) {
    case ACTIVITY_TYPES.LESSON_COMPLETED:
      return {
        title: a.lesson ? `Completed “${a.lesson.title}”` : "Completed a lesson",
        href: lessonHref,
      };
    case ACTIVITY_TYPES.EXERCISE_COMPLETED:
      return {
        title: a.lesson ? `Passed an exercise in “${a.lesson.title}”` : "Passed an exercise",
        href: lessonHref,
      };
    case ACTIVITY_TYPES.QUIZ_PASSED:
      return {
        title: a.lesson ? `Passed a quiz in “${a.lesson.title}”` : "Passed a quiz",
        href: lessonHref,
      };
    case ACTIVITY_TYPES.QUIZ_FAILED:
      return {
        title: a.lesson ? `Retook a quiz in “${a.lesson.title}”` : "Retook a quiz",
        href: lessonHref,
      };
    case ACTIVITY_TYPES.ACHIEVEMENT_EARNED:
      return { title: `Earned achievement: ${String(data.name ?? "New badge")}`, href: "/achievements" };
    case ACTIVITY_TYPES.LEVEL_UP:
      return { title: `Reached Level ${String(data.level ?? "")}`.trim(), href: null };
    case ACTIVITY_TYPES.STREAK_MILESTONE:
      return { title: `Hit a ${String(data.streak ?? "")}-day streak`, href: null };
    case ACTIVITY_TYPES.PROJECT_SUBMITTED:
      return { title: `Submitted project “${String(data.title ?? "Untitled")}”`, href: "/projects" };
    case ACTIVITY_TYPES.PROJECT_APPROVED:
      return { title: `Project “${String(data.title ?? "")}” approved`.trim(), href: "/projects" };
    case ACTIVITY_TYPES.CERTIFICATE_EARNED:
      return { title: `Earned a certificate for ${a.course ? a.course.title : "a course"}`, href: "/certificates" };
    case ACTIVITY_TYPES.COURSE_COMPLETED:
      return { title: a.course ? `Completed “${a.course.title}”` : "Completed a course", href: a.course ? `/courses/${a.course.slug}` : null };
    case ACTIVITY_TYPES.STUDY_DAY:
      return { title: `Studied for ${String(data.minutes ?? "")} minutes`.trim(), href: null };
    default:
      return { title: "Activity recorded", href: null };
  }
}
