// Nadaje rolę ADMIN kontu effdoa@gmail.com (i ewentualnym dodatkowym z ADMIN_EMAILS)
// oraz tworzy brakujący profil i portfel.
// Uruchomienie: node scripts/seed-admin.js
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "effdoa@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function main() {
  for (const email of ADMIN_EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`[seed-admin] Brak konta ${email} — zarejestruj je najpierw w aplikacji.`);
      continue;
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: "admin", email_verified: true } });
    const profile = await prisma.profile.findFirst({ where: { user_id: user.id } });
    if (!profile) {
      await prisma.profile.create({
        data: {
          user_id: user.id,
          display_name: user.full_name || email.split("@")[0],
          account_type: "enthusiast",
          created_by_id: user.id,
        },
      });
    }
    const wallet = await prisma.wallet.findUnique({ where: { user_id: user.id } });
    if (!wallet) await prisma.wallet.create({ data: { user_id: user.id, coins: 0 } });
    console.log(`[seed-admin] ${email} → role=ADMIN ✓`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
