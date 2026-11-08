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

const keepCatIds = new Set();
const keepItemIds = new Set();

for (let ci = 0; ci < ATHENA_MENU.length; ci++) {
  const cat = ATHENA_MENU[ci];
  let category = await prisma.category.findFirst({ where: { name: cat.name } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: cat.name, sortOrder: ci + 1, isActive: true },
    });
  } else {
    category = await prisma.category.update({
      where: { id: category.id },
      data: { sortOrder: ci + 1, isActive: true },
    });
  }
  keepCatIds.add(category.id);

  for (let ii = 0; ii < cat.items.length; ii++) {
    const item = cat.items[ii];
    const existing = await prisma.menuItem.findFirst({
      where: { categoryId: category.id, name: item.name },
    });
    if (!existing) {
      const created = await prisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: item.name,
          price: item.price,
          sortOrder: ii + 1,
          isActive: true,
          isAvailable: true,
        },
      });
      keepItemIds.add(created.id);
    } else {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          price: item.price,
          sortOrder: ii + 1,
          isActive: true,
          isAvailable: true,
        },
      });
      keepItemIds.add(existing.id);
    }
  }
}

await prisma.menuItem.updateMany({
  where: { id: { notIn: [...keepItemIds] } },
  data: { isActive: false },
});
await prisma.category.updateMany({
  where: { id: { notIn: [...keepCatIds] } },
  data: { isActive: false },
});

const activeItems = await prisma.menuItem.count({ where: { isActive: true } });
const activeCats = await prisma.category.count({ where: { isActive: true } });
console.log(`ATHENA_MENU_OK cats=${activeCats} items=${activeItems}`);
await prisma.$disconnect();
