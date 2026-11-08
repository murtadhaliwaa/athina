import { Suspense } from "react";
import { ReportsSubnav } from "@/components/owner/reports/reports-subnav";
import { ReportDateFilter } from "@/components/owner/reports/report-date-filter";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n/ar-iq";

function FilterSkeleton() {
  return <Skeleton className="h-28 w-full rounded-2xl bg-card" />;
}

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-4 pt-3">
      <PageHeader title={t("nav.reports")} />
      <Suspense fallback={<FilterSkeleton />}>
        <ReportDateFilter />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-11 w-full rounded-full bg-card" />}>
        <ReportsSubnav />
      </Suspense>
      {children}
    </div>
  );
}
