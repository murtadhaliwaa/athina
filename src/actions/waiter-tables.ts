"use server";

import { requireUser } from "@/lib/auth/guard";
import {
  getWaiterTableCards,
  type WaiterTableCard,
} from "@/lib/queries/waiter-tables";

export async function fetchWaiterTableCards(): Promise<
  { ok: true; cards: WaiterTableCard[] } | { ok: false }
> {
  try {
    await requireUser(["WAITER", "OWNER"]);
    const cards = await getWaiterTableCards();
    return { ok: true, cards };
  } catch {
    return { ok: false };
  }
}
