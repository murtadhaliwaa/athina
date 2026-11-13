import { redirect } from "next/navigation";
import { OrderBuilder } from "@/components/shared/order-builder";
import { isWaterItemName } from "@/lib/billing/water-constants";
import { isOffersCategoryName } from "@/lib/offers/constants";
import { getMenuCatalog } from "@/lib/queries/menu";
import { getActiveOfferMenuItems } from "@/lib/queries/offers";
import { getOpenShiftCached } from "@/lib/shifts/helpers";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n/ar-iq";

export const dynamic = "force-dynamic";

export default async function WaiterNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const { table: tableId } = await searchParams;
  if (!tableId) redirect("/waiter");

  const [rawCategories, activeOffers, table, shift] = await Promise.all([
    getMenuCatalog(),
    getActiveOfferMenuItems(),
    prisma.cafeTable.findUnique({
      where: { id: tableId },
      select: { id: true, label: true, isActive: true },
    }),
    getOpenShiftCached(),
  ]);

  if (!table?.isActive) redirect("/waiter");

  // الماء يُضاف تلقائياً — والعروض المفعّلة ظاهرة دائماً (خارج الوقت: غير متاح)
  const baseCategories = rawCategories
    .filter((c) => !isOffersCategoryName(c.name))
    .map((c) => ({
      ...c,
      items: c.items.filter((it) => !isWaterItemName(it.name)),
    }))
    .filter((c) => c.items.length > 0);

  const categories = activeOffers
    ? [
        {
          id: activeOffers.categoryId,
          name: t("nav.offers"),
          items: activeOffers.items,
        },
        ...baseCategories,
      ]
    : baseCategories;

  return (
    <OrderBuilder
      categories={categories}
      tableId={table.id}
      tableLabel={table.label}
      redirectTo="/waiter"
      shiftOpen={Boolean(shift)}
    />
  );
}
