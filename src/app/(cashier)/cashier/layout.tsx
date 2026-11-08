import { requireRolePage } from "@/lib/auth/require-role";
import { getOpenShiftCached } from "@/lib/shifts/helpers";
import { CashierBottomNav } from "@/components/cashier/bottom-nav";
import { AppHeaderActionsBar } from "@/components/shared/app-header-actions";
import { PageHeaderProvider } from "@/components/shared/page-header";
import { t } from "@/lib/i18n/ar-iq";

export default async function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, shift] = await Promise.all([
    requireRolePage(["CASHIER", "OWNER"]),
    getOpenShiftCached(),
  ]);

  return (
    <PageHeaderProvider>
      <div className="relative flex min-h-full flex-1 flex-col bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <AppHeaderActionsBar />
        {!shift && (
          <p className="bg-destructive/10 text-destructive px-4 py-2 text-center text-sm">
            {t("shift.closed")}
          </p>
        )}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <CashierBottomNav />
      </div>
    </PageHeaderProvider>
  );
}
