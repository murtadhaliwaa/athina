import { MenuPanel } from "@/components/owner/menu-panel";
import { prisma } from "@/lib/prisma";

export default async function OwnerMenuPage() {
  // المالك يرى النشط والمخفي معاً حتى يقدر يعيد التفعيل
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      isActive: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
          isAvailable: true,
          isActive: true,
          imagePath: true,
        },
      },
    },
  });

  return <MenuPanel categories={categories} />;
}
