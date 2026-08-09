/*
 * CodeSphere
 * One-off script: create + publish a "What's New" release summarizing the
 * current feature set. Idempotent for the fixed version string.
 */

process.loadEnvFile?.(".env");

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const VERSION = "0.8.0";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ChangeInput = { type: string; title: string; description: string; order: number };

const changes: ChangeInput[] = [
  // ── new ──
  { type: "new", order: 0, title: "Programming worlds & boss battles", description: "Work through courses to charge your mastery meter, then take on world bosses to unlock the next world." },
  { type: "new", order: 1, title: "Networking Lab", description: "Drag devices onto a canvas, wire them up, and work through cabling and routing missions step by step." },
  { type: "new", order: 2, title: "Live collaboration rooms", description: "Join a room by code and learn side-by-side with others in real time." },
  { type: "new", order: 3, title: "Daily missions", description: "Turn your daily goals, streaks and challenges into missions with rewards." },
  { type: "new", order: 4, title: "Store & cosmetics", description: "Spend coins on avatars and perks, and show them off on your profile." },
  { type: "new", order: 5, title: "Certificate center", description: "Earn and download certificates as you finish courses and worlds." },
  { type: "new", order: 6, title: "What's New — update notes", description: "Official release notes now live on the dashboard and on this page, so you never miss what changed." },
  { type: "new", order: 7, title: "Code playground", description: "Experiment with HTML, CSS and JavaScript in a sandbox without leaving the app." },
  // ── improvements ──
  { type: "improvement", order: 0, title: "Smarter study plan", description: "Daily recommendations pick the lessons that fit your goals and progress best." },
  { type: "improvement", order: 1, title: "XP, levels & titles", description: "A full progression system — level up, climb the leaderboard and unlock titles." },
  { type: "improvement", order: 2, title: "Study time dashboard", description: "Track your minutes against a daily goal with a 14-day activity chart." },
  { type: "improvement", order: 3, title: "Activity feed", description: "See your latest lessons, achievements and milestones at a glance." },
  { type: "improvement", order: 4, title: "Project showcase", description: "Submit your projects and have them reviewed." },
  // ── fixes ──
  { type: "fix", order: 0, title: "Faster dashboard", description: "Rebalanced the dashboard queries so everything loads in a single pass." },
  { type: "fix", order: 1, title: "Reliable progress sync", description: "Progress and streaks now save correctly when you finish a lesson." },
];

async function main() {
  const existing = await prisma.release.findUnique({ where: { version: VERSION } });
  if (existing) {
    await prisma.releaseChange.deleteMany({ where: { releaseId: existing.id } });
    await prisma.release.update({
      where: { id: existing.id },
      data: {
        title: "The CodeSphere 0.8 Update — Worlds, Networks & Collaboration",
        summary: "Dive into the world map, build live networks in the Lab, and team up in real-time rooms.",
        description:
          "This is the big one. The 0.8 update turns learning into an adventure: progress through the programming worlds, battle bosses to unlock new territory, build real networks in the Lab, and collaborate in live rooms. Your dashboard now tracks study time, streaks and daily missions, and every change lands in these update notes.",
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
        title: "The CodeSphere 0.8 Update — Worlds, Networks & Collaboration",
        summary: "Dive into the world map, build live networks in the Lab, and team up in real-time rooms.",
        description:
          "This is the big one. The 0.8 update turns learning into an adventure: progress through the programming worlds, battle bosses to unlock new territory, build real networks in the Lab, and collaborate in live rooms. Your dashboard now tracks study time, streaks and daily missions, and every change lands in these update notes.",
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
