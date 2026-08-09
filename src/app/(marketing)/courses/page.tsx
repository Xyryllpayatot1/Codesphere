import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCachedCategories, getCachedCourseListing } from "@/lib/content/course-cache";
import { CourseCard } from "@/components/marketing/course-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

export default async function CoursesPage({ searchParams }: PageProps<"/courses">) {
  const params = await searchParams;
  const q = first(params.q)?.trim() ?? "";
  const cat = first(params.cat) ?? "";
  const difficulty = first(params.difficulty) ?? "";
  const sort = first(params.sort) ?? "popular";

  const hasFilters = Boolean(q || cat || difficulty) || sort !== "popular";

  // The default listing is stable, public content → served from the data cache.
  // Filtered/search listings stay dynamic (bounded cache keys, no stale results).
  const [categories, courses] = hasFilters
    ? await Promise.all([
        prisma.category.findMany({
          include: { _count: { select: { courses: true } } },
          orderBy: { order: "asc" },
        }),
        prisma.course.findMany({
          where: {
            status: "PUBLISHED",
            ...(cat ? { category: { slug: cat } } : {}),
            ...(difficulty ? { difficulty } : {}),
            ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
          },
          include: {
            category: true,
            _count: { select: { modules: true, lessons: true, enrollments: true } },
          },
          orderBy:
            sort === "title"
              ? { title: "asc" }
              : sort === "newest"
                ? { createdAt: "desc" }
                : { enrollments: { _count: "desc" } },
        }),
      ])
    : await Promise.all([getCachedCategories(), getCachedCourseListing()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Browse courses</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Interactive, project-driven paths to real programming skills. Every lesson runs in your browser — no installs, no AI gimmicks.
        </p>
      </header>

      <form method="get" action="/courses" className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search courses…" className="pl-9" aria-label="Search courses" />
        </div>
        <input type="hidden" name="cat" value={cat} />
        <input type="hidden" name="difficulty" value={difficulty} />
        <input type="hidden" name="sort" value={sort} />
        <Button type="submit">Search</Button>
      </form>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link href={`/courses${buildQuery({ q, difficulty, sort, cat: "" })}`}>
          <Badge variant={!cat ? "default" : "secondary"} className="px-3 py-1 hover:opacity-90">
            All
          </Badge>
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/courses${buildQuery({ q, difficulty, sort, cat: c.slug })}`}>
            <Badge variant={cat === c.slug ? "default" : "secondary"} className="px-3 py-1 hover:opacity-90">
              {c.name} <span className="ml-1 text-muted-foreground">{c._count.courses}</span>
            </Badge>
          </Link>
        ))}

        <span className="mx-2 h-5 w-px bg-border" aria-hidden />

        {Object.entries(DIFFICULTIES).map(([key, value]) => (
          <Link key={key} href={`/courses${buildQuery({ q, difficulty: difficulty === value ? "" : value, sort, cat })}`}>
            <Badge variant={difficulty === value ? "default" : "outline"} className="px-3 py-1 hover:opacity-90">
              {DIFFICULTY_LABELS[value]}
            </Badge>
          </Link>
        ))}

        <span className="mx-2 h-5 w-px bg-border" aria-hidden />

        <Link
          href={`/courses${buildQuery({ q, cat, difficulty, sort: sort === "title" ? "popular" : "title" })}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {sort === "title" ? "Sort: A–Z" : "Sort: Popular"}
        </Link>

        {hasFilters && (
          <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-destructive">
            <X className="h-3.5 w-3.5" /> Clear filters
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <p className="text-lg font-medium">No courses match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or clear the filters.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={{
                id: course.id,
                title: course.title,
                slug: course.slug,
                description: course.description,
                color: course.color,
                icon: course.icon,
                difficulty: course.difficulty,
                estimatedHours: course.estimatedHours,
                category: course.category,
                counts: {
                  modules: course._count.modules,
                  lessons: course._count.lessons,
                  enrollments: course._count.enrollments,
                },
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function buildQuery({ q, cat, difficulty, sort }: { q: string; cat: string; difficulty: string; sort: string }): string {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (cat) sp.set("cat", cat);
  if (difficulty) sp.set("difficulty", difficulty);
  if (sort && sort !== "popular") sp.set("sort", sort);
  const str = sp.toString();
  return str ? `?${str}` : "";
}
