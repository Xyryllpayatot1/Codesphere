/*
 * CreyvaPH
 * Copyright © 2026 Jhon Xyryll Samoy
 * All rights reserved.
 */

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

// ---------------------------------------------------------------------------
// Pool tuning. The app connects through Supabase's Supavisor pooler, which
// closes idle/long-lived server connections. If node-postgres hands out a
// client whose backend was killed, the query fails with "Server has closed
// the connection." — exactly the 500s seen in the app layout. To avoid that:
//   - idleTimeoutMillis: shed clients that sit idle so nothing survives long
//     enough for the pooler to drop it server-side;
//   - maxLifetimeSeconds / maxUses: rotate clients so stale sockets never
//     get checked out again;
//   - connectionTimeoutMillis: fail fast instead of hanging when the pool is
//     exhausted;
//   - keepAlive: let TCP detect dead sockets promptly.
// ---------------------------------------------------------------------------

function createPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Add your Supabase Postgres URL to .env");
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    maxUses: 7_500,
    maxLifetimeSeconds: 45,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    application_name: "creyvaph",
  });
  // An idle pooled client can be dropped by the pooler at any time. Without a
  // listener, node treats the emitted "error" as an uncaught exception and
  // crashes the process. The client is removed and replaced on next use.
  pool.on("error", (err) => {
    console.error("[pg] idle pool client error (reconnecting on next query):", err.message);
  });
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
