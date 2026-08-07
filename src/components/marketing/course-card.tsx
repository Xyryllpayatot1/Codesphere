import Link from "next/link";
import { Card } from "@/components/ui/card";
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
  return (
    <Link href={`/courses/${course.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition hover:shadow-lg">
        <div className="h-1.5" style={{ background: course.color }} />
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg text-lg" style={{ background: `${course.color}22`, color: course.color }}>
              {course.icon ?? "📘"}
            </span>
            {course.category && <Badge variant="secondary">{course.category.name}</Badge>}
          </div>
          <h3 className="font-semibold group-hover:text-primary">{course.title}</h3>
          <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{course.description}</p>
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{DIFFICULTY_LABELS[course.difficulty as keyof typeof DIFFICULTY_LABELS] ?? course.difficulty}</span>
            <span>·</span>
            <span>{course.estimatedHours} hrs</span>
            <span>·</span>
            <span>{course.counts.modules} modules</span>
            <span>·</span>
            <span>{course.counts.lessons} lessons</span>
            <span>·</span>
            <span>{course.counts.enrollments} learners</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
