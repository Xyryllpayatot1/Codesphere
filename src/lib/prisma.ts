import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Prisma 7 requires a driver adapter. We connect to Supabase Postgres through
// node-postgres (pg). For local SQLite dev, swap back to
// @prisma/adapter-better-sqlite3 and set DATABASE_URL="file:./dev.db".
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pgPool?: pg.Pool };

function createPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Add your Supabase Postgres URL to .env");
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  // Re-use the same pool per process so hot-reload (dev) does not leak sockets.
  globalForPrisma.pgPool = pool;
  return pool;
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg(globalForPrisma.pgPool ?? createPool());
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
