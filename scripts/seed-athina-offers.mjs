import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env", override: false });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OFFERS_CATEGORY_NAME = "العروض";

const OFFERS = [
  {
    name: "عرض خاااص",
    price: 5000,
    startMinute: 15 * 60, // 3:00 عصراً
    endMinute: 18 * 60, // 6:00 مساءً
    components: ["كريب نوتيلا", "عصير من اختيارك", "ماء"],
  },
  {
    name: "عرض نااااار",
    price: 3000,
    startMinute: 12 * 60, // 12:00 ظهراً
    endMinute: 18 * 60, // 6:00 مساءً
    components: ["أركيلة خشب", "شاي", "ماء", "ضيافة"],
  },
];

async function ensureOffersCategory() {
  const existing = await prisma.category.findFirst({
    where: { name: OFFERS_CATEGORY_NAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const created = await prisma.category.create({
    data: {
      name: OFFERS_CATEGORY_NAME,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      isActive: true,
    },
    select: { id: true },
  });
  return created.id;
}

function description(labels) {
  return labels.join(" · ");
}

for (const offer of OFFERS) {
  const existing = await prisma.offer.findFirst({
    where: { name: offer.name },
    select: { id: true, menuItemId: true },
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id: existing.id },
        data: {
          price: offer.price,
          startMinute: offer.startMinute,
          endMinute: offer.endMinute,
          isActive: true,
        },
      });
      await tx.offerComponent.deleteMany({ where: { offerId: existing.id } });
      await tx.offerComponent.createMany({
        data: offer.components.map((label, i) => ({
          offerId: existing.id,
          label,
          sortOrder: i + 1,
        })),
      });
      await tx.menuItem.update({
        where: { id: existing.menuItemId },
        data: {
          name: offer.name,
          price: offer.price,
          description: description(offer.components),
          isActive: true,
          isAvailable: true,
        },
      });
    });
    console.log("حدّث:", offer.name);
    continue;
  }

  const categoryId = await ensureOffersCategory();
  const maxItem = await prisma.menuItem.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });

  await prisma.$transaction(async (tx) => {
    const menuItem = await tx.menuItem.create({
      data: {
        categoryId,
        name: offer.name,
        description: description(offer.components),
        price: offer.price,
        isActive: true,
        isAvailable: true,
        sortOrder: (maxItem._max.sortOrder ?? 0) + 1,
      },
      select: { id: true },
    });

    await tx.offer.create({
      data: {
        name: offer.name,
        price: offer.price,
        startMinute: offer.startMinute,
        endMinute: offer.endMinute,
        isActive: true,
        menuItemId: menuItem.id,
        components: {
          create: offer.components.map((label, i) => ({
            label,
            sortOrder: i + 1,
          })),
        },
      },
    });
  });
  console.log("أضيف:", offer.name);
}

await prisma.$disconnect();
console.log("تم زرع عروض أثينا.");
