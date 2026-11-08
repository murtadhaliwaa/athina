import { requireRolePage } from "@/lib/auth/require-role";
import { getOpenShiftCached } from "@/lib/shifts/helpers";
import { WaiterLiveShell } from "@/components/waiter/waiter-live-shell";
import { AppHeaderActionsBar } from "@/components/shared/app-header-actions";
import { PageHeaderProvider } from "@/components/shared/page-header";

export default async function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // لا نجلب طلبات «جاهز» هنا — يثقل كل تنقّل. WaiterLiveShell يجلبها خفيفاً عند الحاجة.
  const [, shift] = await Promise.all([
    requireRolePage(["WAITER", "OWNER"]),
    getOpenShiftCached(),
  ]);

  return (
    <PageHeaderProvider>
      <AppHeaderActionsBar />
      <WaiterLiveShell
        shiftOpen={Boolean(shift)}
        initialMine={[]}
        initialReadyCount={0}
      >
        {children}
      </WaiterLiveShell>
    </PageHeaderProvider>
  );
}
