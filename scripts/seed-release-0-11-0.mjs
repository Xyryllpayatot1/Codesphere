// Seeds the What's New entry for v0.11.0 (idempotent upsert on version).
import { Pool } from "pg";
import { readFileSync } from "fs";

const url = readFileSync(".env", "utf8").match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 2 });

const RELEASE = {
  version: "0.11.0",
  title: "The Platform Refresh — new design, faster everywhere",
  summary:
    "CreyvaPH gets a full visual redesign, a rebuilt landing page, major performance work across lessons and rewards, and a more capable mobile Networking Lab.",
  description:
    "This update focuses on making CreyvaPH feel like a professional learning platform: one coherent design system across every page, a calmer and more focused dashboard, and significant engineering work to keep the platform fast as it grows.",
  changes: [
    { type: "new", title: "Complete visual redesign", description: "A single design system now drives every surface — typography, spacing, color tokens, buttons, cards, dialogs and forms are consistent app-wide." },
    { type: "new", title: "Rebuilt landing page", description: "The homepage now explains what CreyvaPH is in seconds, with the Networking Laboratory front and center alongside real course data." },
    { type: "new", title: "Lab view controls", description: "A new Fit View button centers and scales your whole topology instantly — on desktop and touch screens alike." },
    { type: "improvement", title: "Faster lesson and quiz completion", description: "Completing learning activities triggers far fewer database round trips, so progress saves noticeably quicker." },
    { type: "improvement", title: "Smarter study plans", description: "Plan generation only looks at recent history instead of scanning everything, and concurrent loads can no longer collide." },
    { type: "improvement", title: "Mobile lab upgrades", description: "The Activity Log is available on phones, packet animations stay visible while testing, and collaboration panels adapt to small screens." },
    { type: "improvement", title: "Accessibility pass", description: "Keyboard navigation for dropdowns and dialogs, consistent focus rings, and pinch-to-zoom restored on mobile." },
    { type: "fix", title: "Reliability fixes", description: "Fixed duplicate-study-plan errors under load, an unscoped quiz-statistics query, and PWA installs for signed-out visitors." },
  ],
};

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const existing = await client.query('SELECT id FROM "Release" WHERE version = $1', [RELEASE.version]);
  let releaseId;
  if (existing.rows.length > 0) {
    releaseId = existing.rows[0].id;
    await client.query(
      'UPDATE "Release" SET title = $2, summary = $3, description = $4, "isPublished" = true, "publishedAt" = COALESCE("publishedAt", now()) WHERE id = $1',
      [releaseId, RELEASE.title, RELEASE.summary, RELEASE.description]
    );
    await client.query('DELETE FROM "ReleaseChange" WHERE "releaseId" = $1', [releaseId]);
  } else {
    // Prisma generates cuid() ids application-side — replicate the shape here.
    const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const inserted = await client.query(
      'INSERT INTO "Release" (id, version, title, summary, description, "isPublished", "publishedAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, true, now(), now()) RETURNING id',
      [id, RELEASE.version, RELEASE.title, RELEASE.summary, RELEASE.description]
    );
    releaseId = inserted.rows[0].id;
  }
  let order = 0;
  for (const c of RELEASE.changes) {
    const changeId = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    await client.query(
      'INSERT INTO "ReleaseChange" (id, "releaseId", type, title, description, "order") VALUES ($1, $2, $3, $4, $5, $6)',
      [changeId, releaseId, c.type, c.title, c.description, order++]
    );
  }
  await client.query("COMMIT");
  console.log(`seeded release ${RELEASE.version} (${RELEASE.changes.length} changes)`);
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await pool.end();
}
