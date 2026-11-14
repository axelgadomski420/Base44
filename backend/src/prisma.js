import { PrismaClient } from "@prisma/client";

// Single PrismaClient instance shared by the whole process.
// - connection_limit + pool_timeout: stabilne pod PM2 (brak wyczerpania połączeń),
// - error/warn logging: natychmiastowa diagnostyka błędów uprawnień (42501),
// - pgbouncer-friendly (jeśli kiedyś dojdzie PgBouncer — transaction mode).
const url = process.env.DATABASE_URL ?? "";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  datasources: {
    db: {
      url: url.includes("connection_limit")
        ? url
        : url + (url.includes("?") ? "&" : "?") + "connection_limit=10&pool_timeout=20",
    },
  },
});

// Wyraźny komunikat przy błędach uprawnień PostgreSQL (SQLSTATE 42501) —
// zamiast surowego "permission denied for schema public" operator dostaje instrukcję naprawy.
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (err) {
    if (err?.code === "P2025") throw err;
    const msg = String(err?.message ?? "");
    if (msg.includes("42501") || msg.includes("permission denied")) {
      console.error(
        "[prisma] Błąd uprawnień bazy (42501). Uruchom na serwerze:\n" +
          "  sudo -u postgres psql -d purrepets -f backend/scripts/fix-db-perms.sql\n" +
          "i upewnij się, że DATABASE_URL wskazuje użytkownika właściciela schematu public."
      );
    }
    throw err;
  }
});
