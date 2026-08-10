// ---------------------------------------------------------------------------
// CreyvaPH
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CreyvaPH
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";

// Duplicate sitemap exposed at /mysite.xml. Reads course data from the database
// at runtime (no build-time database dependency), matching src/app/sitemap.ts.
export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { order: "asc" },
  });

  const now = new Date().toISOString();

  const staticUrls = [
    { loc: siteUrl("/"), lastmod: now, changefreq: "weekly", priority: "1.0" },
    { loc: siteUrl("/courses"), lastmod: now, changefreq: "daily", priority: "0.9" },
    { loc: siteUrl("/about"), lastmod: now, changefreq: "monthly", priority: "0.5" },
    { loc: siteUrl("/credits"), lastmod: now, changefreq: "yearly", priority: "0.3" },
  ];

  const courseUrls = courses.map((course) => ({
    loc: siteUrl(`/courses/${course.slug}`),
    lastmod: course.updatedAt.toISOString(),
    changefreq: "weekly",
    priority: "0.7",
  }));

  const urlTags = [...staticUrls, ...courseUrls]
    .map(
      (u) =>
        `\n<url>\n<loc>${escapeXml(u.loc)}</loc>\n<lastmod>${u.lastmod}</lastmod>\n<changefreq>${u.changefreq}</changefreq>\n<priority>${u.priority}</priority>\n</url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlTags}\n</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
