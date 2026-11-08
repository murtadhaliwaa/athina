import { getDiscountsReport } from "@/actions/reports";
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
import { formatBaghdadDateTime } from "@/lib/format-datetime";
import { rangeFromSearchParams } from "@/lib/reports/parse-params";
import { t } from "@/lib/i18n/ar-iq";

export default async function DiscountsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const rows = await getDiscountsReport(rangeFromSearchParams(sp));

  return (
    <ReportSection
      title={t("reports.discounts")}
      empty={rows.length === 0}
      export={
        <ReportExportButtons
          filename="discounts.csv"
          title={t("reports.discounts")}
          headers={[
            t("reports.colTable"),
            t("bill.discount"),
            t("bill.discountReason"),
            t("reports.colCashier"),
            t("audit.time"),
          ]}
          rows={rows.map((r) => [
            r.tableLabel ?? t("tables.unlabeled"),
            r.discountAmount,
            r.reason ?? "",
            r.cashierName ?? "",
            r.paidAt ? formatBaghdadDateTime(r.paidAt) : "",
          ])}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.colTable")}</TableHead>
            <TableHead>{t("bill.discount")}</TableHead>
            <TableHead>{t("bill.discountReason")}</TableHead>
            <TableHead>{t("reports.colCashier")}</TableHead>
            <TableHead>{t("audit.time")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.billId}>
              <TableCell>{r.tableLabel ?? t("tables.unlabeled")}</TableCell>
              <TableCell>
                <MoneyBdi amount={r.discountAmount} />
              </TableCell>
              <TableCell className="max-w-[12rem]">{r.reason ?? "—"}</TableCell>
              <TableCell>{r.cashierName ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap">
                {r.paidAt ? formatBaghdadDateTime(r.paidAt) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportSection>
  );
}
