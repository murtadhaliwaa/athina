import { Suspense } from "react";
import { getAuditLogs, listStaffForAuditFilter } from "@/actions/reports";
import { AuditPanel } from "@/components/owner/audit-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { rangeFromSearchParams } from "@/lib/reports/parse-params";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
    actorId?: string;
    entityType?: string;
    action?: string;
  }>;
}) {
  const sp = await searchParams;
  const range = rangeFromSearchParams(sp);
  const [logs, staff] = await Promise.all([
    getAuditLogs({
      ...range,
      actorId: sp.actorId,
      entityType: sp.entityType,
      action: sp.action,
    }),
    listStaffForAuditFilter(),
  ]);

  return (
    <Suspense
      fallback={
        <Skeleton className="mx-auto m-4 h-64 w-full max-w-5xl rounded-2xl bg-card" />
      }
    >
      <AuditPanel logs={logs} staff={staff} />
    </Suspense>
  );
}
