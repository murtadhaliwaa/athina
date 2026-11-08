import "dotenv/config";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { ATHENA_MENU } from "./athena-menu-data.mjs";

config({ path: ".env.local", override: true });

const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url } } });

const athenaCatNames = new Set(ATHENA_MENU.map((c) => c.name));
const athenaItemKeys = new Set();
for (const cat of ATHENA_MENU) {
  for (const item of cat.items) {
    athenaItemKeys.add(`${cat.name}\0${item.name}`);
  }
}

const categories = await prisma.category.findMany({
  include: {
    items: {
      select: {
        id: true,
        name: true,
        _count: { select: { orderItems: true } },
      },
    },
  },
});

let deletedItems = 0;
let hiddenItems = 0;
let deletedCats = 0;
let hiddenCats = 0;

for (const cat of categories) {
  for (const item of cat.items) {
    const keep = athenaItemKeys.has(`${cat.name}\0${item.name}`);
    if (keep) continue;

    if (item._count.orderItems === 0) {
      await prisma.menuItem.delete({ where: { id: item.id } });
      deletedItems += 1;
      console.log(`DELETE item: ${cat.name} / ${item.name}`);
    } else {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: { isActive: false, isAvailable: false },
      });
      hiddenItems += 1;
      console.log(
        `HIDE item (له طلبات قديمة): ${cat.name} / ${item.name} ×${item._count.orderItems}`,
      );
    }
  }
}

const catsAfter = await prisma.category.findMany({
  include: { _count: { select: { items: true } } },
});

for (const cat of catsAfter) {
  if (athenaCatNames.has(cat.name)) {
    await prisma.category.update({
      where: { id: cat.id },
      data: { isActive: true },
    });
    continue;
  }

  if (cat._count.items === 0) {
    await prisma.category.delete({ where: { id: cat.id } });
    deletedCats += 1;
    console.log(`DELETE category: ${cat.name}`);
  } else {
    await prisma.category.update({
      where: { id: cat.id },
      data: { isActive: false },
    });
    hiddenCats += 1;
    console.log(`HIDE category (فيها أصناف مربوطة): ${cat.name}`);
  }
}

const active = await prisma.menuItem.count({ where: { isActive: true } });
const activeCats = await prisma.category.count({ where: { isActive: true } });
console.log({
  deletedItems,
  hiddenItems,
  deletedCats,
  hiddenCats,
  activeCats,
  activeItems: active,
});

await prisma.$disconnect();
