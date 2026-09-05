// Prisma Client singleton (Prisma ORM v7 + PostgreSQL driver adapter).
//
// In v7 the Rust query engine is gone; the client talks to Postgres through a
// JS driver adapter (@prisma/adapter-pg, backed by `pg`). The connection
// string comes from DATABASE_URL at runtime — the same variable that
// prisma.config.ts reads for the CLI.
//
// This module is kept framework-agnostic so it can be imported from server
// components, route handlers, and server actions. It is NOT imported on the
// client (Prisma only runs server-side).
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Reuse a single client across hot-reloads in development to avoid exhausting
// database connections during `next dev`.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env before running the app.",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
