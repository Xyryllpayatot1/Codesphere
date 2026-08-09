/*
 * CreyvaPH
 * One-off script: create + publish a "What's New" release documenting the
 * rebrand and SEO foundation. Idempotent for the fixed version string.
 */

process.loadEnvFile?.(".env");

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const VERSION = "0.9.0";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ChangeInput = { type: string; title: string; description: string; order: number };

const changes: ChangeInput[] = [
  // ── new ──
  { type: "new", order: 0, title: "CreyvaPH rebrand", description: "The platform (formerly CodeSphere) is now called CreyvaPH. The app name, logo, metadata, and documentation all use the new identity." },
  { type: "new", order: 1, title: "New tagline — Create. Learn. Evolve.", description: "Our new tagline now appears across the landing page, login, and register screens." },
  { type: "new", order: 2, title: "SEO foundation", description: "Canonical URLs, Open Graph and Twitter cards, an XML sitemap, robots.txt, and JSON-LD structured data now describe every public page, preparing CreyvaPH for search engines." },
  // ── improvements ──
  { type: "improvement", order: 0, title: "Public pages unlocked", description: "The Credits page and health-check endpoints are now reachable without signing in." },
  { type: "improvement", order: 1, title: "Deployment & docs", description: "The app deploys as creyvaph-lms on Render with a configurable public URL, and new guides cover the Render migration and Google Search Console verification." },
];

async function main() {
  const existing = await prisma.release.findUnique({ where: { version: VERSION } });
  if (existing) {
    await prisma.releaseChange.deleteMany({ where: { releaseId: existing.id } });
    await prisma.release.update({
      where: { id: existing.id },
      data: {
        title: "The CreyvaPH Rebrand — Create. Learn. Evolve.",
        summary: "CreyvaPH is here. A new identity, a new tagline, and a search-ready foundation for the whole platform.",
        description:
          "The platform you know as CodeSphere is now CreyvaPH — with a new tagline, 'Create. Learn. Evolve.', carried across every screen. Behind the scenes, every public page now ships clean canonical URLs, Open Graph and Twitter cards, a sitemap, robots.txt, and structured data, so CreyvaPH is ready to be discovered on the web.",
        releaseDate: new Date(),
        isPublished: true,
        publishedAt: new Date(),
        changes: {
          create: changes,
        },
      },
    });
    console.log(`Updated existing release ${VERSION} (id ${existing.id}).`);
  } else {
    const release = await prisma.release.create({
      data: {
        version: VERSION,
        title: "The CreyvaPH Rebrand — Create. Learn. Evolve.",
        summary: "CreyvaPH is here. A new identity, a new tagline, and a search-ready foundation for the whole platform.",
        description:
          "The platform you know as CodeSphere is now CreyvaPH — with a new tagline, 'Create. Learn. Evolve.', carried across every screen. Behind the scenes, every public page now ships clean canonical URLs, Open Graph and Twitter cards, a sitemap, robots.txt, and structured data, so CreyvaPH is ready to be discovered on the web.",
        releaseDate: new Date(),
        isPublished: true,
        publishedAt: new Date(),
        changes: { create: changes },
      },
      select: { id: true, version: true },
    });
    console.log(`Created + published release ${release.version} (id ${release.id}).`);
  }

  const count = await prisma.release.count({ where: { isPublished: true } });
  console.log(`Published releases: ${count}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
