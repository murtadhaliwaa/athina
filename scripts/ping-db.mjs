import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local", override: true });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const t = Date.now();
try {
  const row = await prisma.cafeSettings.findUnique({ where: { id: 1 } });
  console.log("OK", `${Date.now() - t}ms`, row?.cafeName ?? "(no settings)");
} catch (e) {
  console.error("FAIL", `${Date.now() - t}ms`, e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
