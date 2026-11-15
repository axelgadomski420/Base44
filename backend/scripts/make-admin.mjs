import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Bezpieczna inicjalizacja administratora (CLI na serwerze, bez endpointu HTTP).
// Rola "admin" nadawana jest WYŁĄCZNIE e-mailom z listy ADMIN_EMAILS (backend/.env) —
// skrypt odmówi działania dla dowolnego innego adresu.
const email = String(process.argv[2] ?? "").trim().toLowerCase();
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "effdoa@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (!email) {
  console.error("Użycie: node scripts/make-admin.mjs <email>");
  process.exit(1);
}
if (!ADMIN_EMAILS.includes(email)) {
  console.error(`[make-admin] Odrzucono: ${email} nie figuruje w ADMIN_EMAILS (backend/.env).`);
  console.error("[make-admin] Dodaj adres do ADMIN_EMAILS i uruchom ponownie — to celowa ochrona.");
  process.exit(1);
}

const prisma = new PrismaClient();

const result = await prisma.user.updateMany({
  where: { email },
  data: { role: "admin" },
});

console.log(JSON.stringify({ email, updated: result.count }));
await prisma.$disconnect();
