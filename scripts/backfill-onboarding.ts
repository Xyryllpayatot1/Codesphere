/*
 * CodeSphere
 * One-off script: mark existing users as "already onboarded" so the new
 * onboarding gate only applies to accounts created after this change.
 * Idempotent — safe to re-run.
 */

process.loadEnvFile?.(".env");

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, createdAt: true, settings: { select: { onboardedAt: true, learningPath: true } } },
  });

  let updated = 0;
  for (const user of users) {
    if (user.settings?.onboardedAt) continue;
    await prisma.userSetting.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        onboardedAt: user.createdAt,
        notifications: {},
      },
      update: {
        onboardedAt: user.createdAt,
        learningPath: user.settings?.learningPath ?? null,
      },
    });
    updated += 1;
  }

  console.log(`Checked ${users.length} users; backfilled onboarding for ${updated}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
