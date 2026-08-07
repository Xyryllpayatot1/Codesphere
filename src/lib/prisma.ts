import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Prisma 7 requires a driver adapter. We connect to Supabase Postgres through
// node-postgres (pg). Set DATABASE_URL to your Postgres/Supabase connection
// string (pooler or direct). See README.
//
// The client is created lazily so importing this module never connects or
// throws — the first actual query does. This keeps `next build` from crashing
// when DATABASE_URL is temporarily unset (e.g. Render `sync:false` secrets
// that are filled in after the first deploy).
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

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

/** Lazy singleton — first property access creates the client + pool. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});
