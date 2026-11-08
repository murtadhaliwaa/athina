import "dotenv/config";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local", override: true });

const prisma = new PrismaClient();

const open = await prisma.shift.findFirst({ where: { closedAt: null } });
if (open) {
  console.log("SHIFT_OPEN", open.id);
} else {
  const cashier = await prisma.profile.findFirst({
    where: { role: "CASHIER", isActive: true },
  });
  if (!cashier) {
    console.log("NO_CASHIER");
  } else {
    const shift = await prisma.shift.create({
      data: { openedById: cashier.id, openingCash: 100_000 },
    });
    console.log("SHIFT_CREATED", shift.id);
  }
}

console.log("MENU_ITEMS", await prisma.menuItem.count());
await prisma.$disconnect();
