import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type RailLesson = { id: string; title: string; slug: string; order: number; estimatedMinutes: number };
export type RailModule = { id: string; title: string; slug: string; order: number; lessons: RailLesson[] };
export type CompletedMap = Record<string, boolean>;

export function CourseRail({
  courseSlug,
  modules,
  activeLessonId,
  completed,
}: {
  courseSlug: string;
  modules: RailModule[];
  activeLessonId: string;
  completed: CompletedMap;
}) {
  return (
    <aside className="sticky top-[4.5rem] hidden max-h-[calc(100vh-6rem)] w-72 shrink-0 overflow-y-auto border-r border-border pr-4 lg:block">
      <nav aria-label="Course content">
        {modules.map((mod) => {
          const doneCount = mod.lessons.filter((l) => completed[l.id]).length;
          return (
            <div key={mod.id} className="mb-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{mod.title}</p>
                <span className="text-xs text-muted-foreground">
                  {doneCount}/{mod.lessons.length}
                </span>
              </div>
              <ul className="space-y-0.5 border-l border-border">
                {mod.lessons.map((lesson) => {
                  const active = lesson.id === activeLessonId;
                  const isDone = !!completed[lesson.id];
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/learn/${courseSlug}/${mod.slug}/${lesson.slug}`}
                        className={cn(
                          "flex items-center gap-2 border-l-2 py-1.5 pl-3 text-sm transition",
                          active
                            ? "border-primary bg-primary/5 font-medium text-primary"
                            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                        )}
                        <span className="line-clamp-1">{lesson.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export function Breadcrumb({ courseTitle, moduleTitle, courseSlug }: { courseTitle: string; moduleTitle: string; courseSlug: string }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <Link href={`/courses/${courseSlug}`} className="hover:text-foreground">
        {courseTitle}
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="text-foreground/80">{moduleTitle}</span>
    </nav>
  );
}
