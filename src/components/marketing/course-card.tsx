import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_LABELS } from "@/lib/constants";

export type CourseCardData = {
  id: string;
  title: string;
  slug: string;
  description: string;
  color: string;
  icon: string | null;
  difficulty: string;
  estimatedHours: number;
  category: { name: string } | null;
  counts: { modules: number; lessons: number; enrollments: number };
};

export function CourseCard({ course }: { course: CourseCardData }) {
  const meta = [
    DIFFICULTY_LABELS[course.difficulty as keyof typeof DIFFICULTY_LABELS] ?? course.difficulty,
    `${course.estimatedHours} hrs`,
    `${course.counts.lessons} lessons`,
    `${course.counts.enrollments} enrolled`,
  ];

  return (
    <Link href={`/courses/${course.slug}`} className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors group-hover:border-border-strong">
        <div className="h-1" style={{ background: course.color }} aria-hidden />
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-base"
              style={{ background: `${course.color}1a`, color: course.color }}
              aria-hidden
            >
              {course.icon ?? <BookOpen className="h-4 w-4" />}
            </span>
            {course.category && <Badge variant="secondary">{course.category.name}</Badge>}
          </div>
          <h3 className="text-sm font-semibold tracking-tight transition-colors group-hover:text-primary">
            {course.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {course.description}
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {meta.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span aria-hidden>·</span>}
                {m}
              </span>
            ))}
          </p>
        </div>
      </article>
    </Link>
  );
}
