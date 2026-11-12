import { redirect } from "next/navigation";
import { OrderBuilder } from "@/components/shared/order-builder";
import { isWaterItemName } from "@/lib/billing/water-constants";
import { getMenuCatalog } from "@/lib/queries/menu";
import { getOpenShiftCached } from "@/lib/shifts/helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WaiterNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const { table: tableId } = await searchParams;
  if (!tableId) redirect("/waiter");

  const [rawCategories, table, shift] = await Promise.all([
    getMenuCatalog(),
    prisma.cafeTable.findUnique({
      where: { id: tableId },
      select: { id: true, label: true, isActive: true },
    }),
    getOpenShiftCached(),
  ]);

  if (!table?.isActive) redirect("/waiter");

  // الماء يُضاف تلقائياً على الفاتورة — نخفيه من طلب الكابتن لتفادي التكرار
  const categories = rawCategories
    .map((c) => ({
      ...c,
      items: c.items.filter((it) => !isWaterItemName(it.name)),
    }))
    .filter((c) => c.items.length > 0);

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
