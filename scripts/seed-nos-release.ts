/*
 * CreyvaPH
 * One-off script: create + publish a "What's New" release documenting the
 * Network Operating Systems (NOS) course and Networking Lab upgrades.
 * Idempotent for the fixed version string.
 */

process.loadEnvFile?.(".env");

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const VERSION = "0.10.0";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ChangeInput = { type: string; title: string; description: string; order: number };

const changes: ChangeInput[] = [
  // ── new ──
  { type: "new", order: 0, title: "Network Operating Systems (NOS) course", description: "A brand-new advanced course with 15 lessons: device boot, the CLI architecture, configuration, running vs startup config, VLANs, static routing, security, troubleshooting and a full capstone lab." },
  { type: "new", order: 1, title: "Four new Networking Lab missions", description: "Bring up a switch for management, fix interface faults, troubleshoot a broken routed network, and build a two-site enterprise network with VLANs — all inside the simulated CLI." },
  { type: "new", order: 2, title: "Four new lab templates", description: "The lab ships ready-made scenarios: a managed LAN, a faulted LAN, a faulted routed network, and the capstone topology with two switches, two routers and a serial link." },
  { type: "new", order: 3, title: "TechPro category", description: "A new course category for professional infrastructure learning, hosting the Network Operating Systems track." },
  // ── improvements ──
  { type: "improvement", order: 0, title: "Quiz & exercise variety", description: "The NOS course adds 15 quizzes (75 questions) covering ordering, matching and fill-in-the-blank formats, plus 15 targeted exercises on CLI commands, boot order and troubleshooting method." },
];

async function main() {
  const existing = await prisma.release.findUnique({ where: { version: VERSION } });
  if (existing) {
    await prisma.releaseChange.deleteMany({ where: { releaseId: existing.id } });
    await prisma.release.update({
      where: { id: existing.id },
      data: {
        title: "Network Operating Systems — new advanced course",
        summary: "Master the software behind switches and routers with 15 hands-on lessons, new lab missions and a capstone network.",
        description:
          "The new Network Operating Systems course takes you from device boot to enterprise troubleshooting — all through the simulated CLI. Create VLANs, route between sites, fix planted faults, and prove it all in a capstone network where guests are isolated and configs are saved. Four new lab missions and four new templates ship alongside it.",
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
        title: "Network Operating Systems — new advanced course",
        summary: "Master the software behind switches and routers with 15 hands-on lessons, new lab missions and a capstone network.",
        description:
          "The new Network Operating Systems course takes you from device boot to enterprise troubleshooting — all through the simulated CLI. Create VLANs, route between sites, fix planted faults, and prove it all in a capstone network where guests are isolated and configs are saved. Four new lab missions and four new templates ship alongside it.",
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
