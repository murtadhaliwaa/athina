import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const menuSelect = {
  where: { isActive: true },
  orderBy: { sortOrder: "asc" as const },
  include: {
    items: {
      where: { isActive: true },
      orderBy: { sortOrder: "asc" as const },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imagePath: true,
        updatedAt: true,
        isAvailable: true,
        sortOrder: true,
      },
    },
  },
};

const fetchMenuCatalogCached = unstable_cache(
  async () => prisma.category.findMany(menuSelect),
  ["menu-catalog-v36"],
  {
    tags: ["menu"],
    revalidate: 60,
  },
);

/** مرة لكل طلب RSC + كاش قصير بين الطلبات — يمنع 10–20ث على /waiter/new */
export const getMenuCatalog = cache(async () => fetchMenuCatalogCached());
