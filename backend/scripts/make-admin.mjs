import { PrismaClient } from "@prisma/client";

const email = process.argv[2] || "effdoa@gmail.com";
const prisma = new PrismaClient();

const result = await prisma.user.updateMany({
  where: { email },
  data: { role: "admin" },
});

console.log(JSON.stringify({ email, updated: result.count }));
await prisma.$disconnect();
