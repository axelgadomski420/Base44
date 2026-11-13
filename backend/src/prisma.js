import { PrismaClient } from "@prisma/client";

// Single PrismaClient instance shared by the whole process.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
