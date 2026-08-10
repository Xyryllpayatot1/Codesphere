// ---------------------------------------------------------------------------
// CreyvaPH
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CreyvaPH
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import { siteUrl, siteOrigin } from "@/lib/site-url";

// Atom feed exposed at /atom.xml. Lists published courses as feed entries,
// read from the database at runtime (no build-time database dependency).
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
    select: { id: true, slug: true, title: true, updatedAt: true },
    orderBy: { order: "asc" },
  });

  const origin = siteOrigin();
  const now = new Date().toISOString();

  const staticEntries = [
    { id: "home", title: "CreyvaPH — Create. Learn. Evolve.", path: "/", updatedAt: now },
    { id: "courses", title: "Courses", path: "/courses", updatedAt: now },
    { id: "about", title: "About", path: "/about", updatedAt: now },
    { id: "credits", title: "Credits", path: "/credits", updatedAt: now },
  ];

  const entryTags = [
    ...staticEntries.map((e) => ({
      id: e.id,
      title: e.title,
      path: e.path,
      updatedAt: e.updatedAt,
    })),
    ...courses.map((c) => ({
      id: c.id,
      title: c.title,
      path: `/courses/${c.slug}`,
      updatedAt: c.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map(
      (e) =>
        `\n  <entry>\n    <title>${escapeXml(e.title)}</title>\n    <link href="${escapeXml(siteUrl(e.path))}"/>\n    <id>${escapeXml(siteUrl(e.path))}</id>\n    <updated>${e.updatedAt}</updated>\n  </entry>`
    )
    .join("");

  const xml = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom">`,
    `  <title>CreyvaPH</title>`,
    `  <subtitle>Create. Learn. Evolve. — Interactive technology courses.</subtitle>`,
    `  <link href="${escapeXml(origin)}/"/>`,
    `  <link rel="self" href="${escapeXml(siteUrl("/atom.xml"))}"/>`,
    `  <updated>${now}</updated>`,
    `  <id>${escapeXml(origin)}/</id>`,
    `  <author><name>CreyvaPH</name></author>`,
    entryTags,
    `</feed>`,
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
