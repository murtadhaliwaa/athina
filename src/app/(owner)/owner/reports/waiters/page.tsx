import { getWaiterSalesReport } from "@/actions/reports";
import { ReportExportButtons } from "@/components/owner/reports/report-export-buttons";
import { ReportSection } from "@/components/owner/reports/report-section";
import { MoneyBdi } from "@/components/owner/reports/money-bdi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rangeFromSearchParams } from "@/lib/reports/parse-params";
import { t } from "@/lib/i18n/ar-iq";
import { roleLabel } from "@/lib/i18n/role-label";

export default async function WaitersReportPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const rows = await getWaiterSalesReport(rangeFromSearchParams(sp));

  return (
    <ReportSection
      title={t("reports.salesWaiters")}
      empty={rows.length === 0}
      export={
        <ReportExportButtons
          filename="waiter-sales.csv"
          title={t("reports.salesWaiters")}
          headers={[
            t("staff.fullName"),
            t("staff.role"),
            t("reports.colQty"),
            t("reports.colRevenue"),
          ]}
          rows={rows.map((r) => [
            r.fullName,
            roleLabel(r.role),
            r.itemCount,
            r.sales,
          ])}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("staff.fullName")}</TableHead>
            <TableHead>{t("staff.role")}</TableHead>
            <TableHead>{t("reports.colQty")}</TableHead>
            <TableHead>{t("reports.colRevenue")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.staffId}>
              <TableCell>{r.fullName}</TableCell>
              <TableCell>{roleLabel(r.role)}</TableCell>
              <TableCell>
                <bdi dir="ltr">{r.itemCount}</bdi>
              </TableCell>
              <TableCell>
                <MoneyBdi amount={r.sales} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportSection>
  );
}
