import { ShiftPanel } from "@/components/cashier/shift-panel";
import { PageHeader } from "@/components/shared/page-header";
import { findOpenShift } from "@/lib/shifts/helpers";
import { t } from "@/lib/i18n/ar-iq";

export default async function CashierShiftPage() {
  const shift = await findOpenShift();

  return (
    <div className="space-y-4 pb-4">
      <PageHeader title={t("shift.title")} />
      <ShiftPanel
        shift={
          shift
            ? {
                id: shift.id,
                openedAt: shift.openedAt.toISOString(),
                openingCash: shift.openingCash,
              }
            : null
        }
      />
    </div>
  );
}
