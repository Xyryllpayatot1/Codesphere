import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL is intentionally optional at build time: Render fills it in
// after the first deploy (sync:false secret). `prisma generate` never connects,
// so a placeholder is harmless — only db push / migrate / seed need the real URL.
const url = process.env.DATABASE_URL ?? "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url,
  },
});
