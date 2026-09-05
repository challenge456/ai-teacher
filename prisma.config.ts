// Prisma ORM v7 configuration.
// The connection URL is no longer declared in schema.prisma; it lives here and
// is loaded from the environment. The CLI (migrations, validate, etc.) reads
// this file automatically.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // `process.env` is used instead of `env()` so that commands which do not need
  // a live database connection (e.g. `prisma generate`) still succeed when
  // DATABASE_URL is not yet configured.
  datasource: {
    // Migrations require a direct connection; the application runtime continues
    // to use DATABASE_URL through src/db/client.ts.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://localhost:5432/ai-teacher",
  },
});
