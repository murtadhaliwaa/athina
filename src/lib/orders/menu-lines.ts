import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { t } from "@/lib/i18n/ar-iq";

export type OrderLineInput = {
  menuItemId: string;
  quantity: number;
  note?: string | null;
};

export async function loadMenuLinesForOrder(
  tx: Pick<Prisma.TransactionClient, "menuItem">,
  lines: OrderLineInput[]
) {
  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  const menuItems = await tx.menuItem.findMany({
    where: { id: { in: ids } },
    include: { category: { select: { isActive: true, name: true } } },
  });
  const map = new Map(menuItems.map((m) => [m.id, m]));

  return lines.map((line) => {
    const item = map.get(line.menuItemId);
    if (!item || !item.isActive || !item.category.isActive) {
      throw new AppError("VALIDATION", t("error.itemMissing"));
    }
    if (!item.isAvailable) {
      throw new AppError(
        "VALIDATION",
        t("error.itemSoldOutNamed", { name: item.name })
      );
    }
    return {
      menuItemId: item.id,
      nameSnapshot: item.name,
      categorySnapshot: item.category.name,
      priceSnapshot: item.price,
      quantity: line.quantity,
      note: line.note ?? null,
    };
  });
}
