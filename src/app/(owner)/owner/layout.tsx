import { requireRolePage } from "@/lib/auth/require-role";
import { OwnerNav } from "@/components/owner/owner-nav";
import { AppHeaderActionsBar } from "@/components/shared/app-header-actions";
import { PageHeaderProvider } from "@/components/shared/page-header";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRolePage(["OWNER"]);

  return (
    <PageHeaderProvider>
      <div className="bg-background text-foreground relative flex min-h-full flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <AppHeaderActionsBar />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <OwnerNav />
      </div>
    </PageHeaderProvider>
  );
}
