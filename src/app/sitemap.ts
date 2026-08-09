// ---------------------------------------------------------------------------
// CreyvaPH
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CreyvaPH
// ---------------------------------------------------------------------------

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";

// Sitemap reads course data from the database, so it is rendered on demand at
// runtime instead of being pre-built (no build-time database dependency).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { order: "asc" },
  });

  return [
    {
      url: siteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: siteUrl("/courses"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: siteUrl("/about"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: siteUrl("/credits"),
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...courses.map((course) => ({
      url: siteUrl(`/courses/${course.slug}`),
      lastModified: course.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
