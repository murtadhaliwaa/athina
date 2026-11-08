"use server";

import { requireUser } from "@/lib/auth/guard";
import { getCashierBoardOrders } from "@/lib/queries/cashier-board";
import type { BoardOrder } from "@/types/orders";

/** تحديث لوحة الكاشير بإجراء خفيف — بدون router.refresh الكامل */
export async function fetchCashierBoardOrders(): Promise<
  { ok: true; orders: BoardOrder[] } | { ok: false }
> {
  try {
    await requireUser(["CASHIER", "OWNER"]);
    const orders = await getCashierBoardOrders();
    return { ok: true, orders };
  } catch {
    return { ok: false };
  }
}
