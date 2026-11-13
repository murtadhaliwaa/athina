import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getExpensesPageData } from "@/actions/expenses";
/** التصميم الحالي. للرجوع للقديم: استبدل المسار بـ expenses-panel.legacy */
import { ExpensesPanel } from "@/components/owner/expenses-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getCafeSettings } from "@/lib/queries/settings";
import { rangeFromSearchParams } from "@/lib/reports/parse-params";
import { getBusinessDate } from "@/lib/time";

export default async function OwnerExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  if (!sp.preset) {
    redirect("/owner/expenses?preset=thisMonth");
  }
  const rangeInput = rangeFromSearchParams({
    preset: sp.preset,
    from: sp.from,
    to: sp.to,
  });

  const [data, settings] = await Promise.all([
    getExpensesPageData(rangeInput),
    getCafeSettings(),
  ]);

  const todayBusinessDate = getBusinessDate(
    new Date(),
    settings?.businessDayStartHour ?? 5,
  );

  return (
    <Suspense
      fallback={
        <Skeleton className="mx-auto m-4 h-64 w-full max-w-5xl rounded-2xl bg-card" />
      }
    >
      <ExpensesPanel
        expenseTotal={data.expenseTotal}
        salesTotal={data.salesTotal}
        net={data.net}
        count={data.count}
        items={data.items}
        todayBusinessDate={todayBusinessDate}
      />
    </Suspense>
  );
}
