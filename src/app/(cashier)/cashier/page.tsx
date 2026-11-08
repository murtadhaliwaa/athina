import { CashierBoard } from "@/components/cashier/cashier-board";
import { getCurrentProfile } from "@/lib/auth/guard";
import { getOpenShiftCached } from "@/lib/shifts/helpers";
import { getCashierBoardOrders } from "@/lib/queries/cashier-board";

export default async function CashierBoardPage() {
  const [profile, shift, board] = await Promise.all([
    getCurrentProfile(),
    getOpenShiftCached(),
    getCashierBoardOrders(),
  ]);

  return (
    <CashierBoard
      initialOrders={board}
      cashierName={profile?.fullName ?? "—"}
      shiftOpen={Boolean(shift)}
    />
  );
}
