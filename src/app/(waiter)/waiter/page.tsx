import { getCurrentProfile } from "@/lib/auth/guard";
import { getOpenShiftCached } from "@/lib/shifts/helpers";
import { WaiterPageHeader } from "@/components/waiter/waiter-page-header";
import { WaiterTablesGrid } from "@/components/waiter/waiter-tables-grid";
import { getWaiterTableCards } from "@/lib/queries/waiter-tables";
import { t } from "@/lib/i18n/ar-iq";

export default async function WaiterTablesPage() {
  const [profile, shift, cards] = await Promise.all([
    getCurrentProfile(),
    getOpenShiftCached(),
    getWaiterTableCards(),
  ]);

  if (cards.length === 0) {
    return <p className="text-muted-foreground p-6">{t("empty.tables")}</p>;
  }

  return (
    <div className="pb-4">
      <WaiterPageHeader
        title={t("tables.title")}
        statusOk={Boolean(shift)}
        subtitle={`${profile?.fullName ?? "—"} • ${shift ? t("shift.openStatus") : t("shift.closed")}`}
      />
      <WaiterTablesGrid initialCards={cards} />
    </div>
  );
}
