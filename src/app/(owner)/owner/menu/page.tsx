import { MenuPanel } from "@/components/owner/menu-panel";
import { isOffersCategoryName } from "@/lib/offers/constants";
import { prisma } from "@/lib/prisma";

export default async function OwnerMenuPage() {
  // المالك يرى النشط والمخفي معاً حتى يقدر يعيد التفعيل
  // تصنيف «العروض» يُدار من /owner/offers فقط
  const categories = (
    await prisma.category.findMany({
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
    })
  ).filter((c) => !isOffersCategoryName(c.name));

  return <MenuPanel categories={categories} />;
}
