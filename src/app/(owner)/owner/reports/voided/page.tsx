import { getVoidedBillsReport } from "@/actions/reports";
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

export default async function VoidedReportPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const rows = await getVoidedBillsReport(rangeFromSearchParams(sp));

  return (
    <ReportSection
      title={t("reports.voided")}
      empty={rows.length === 0}
      export={
        <ReportExportButtons
          filename="voided-bills.csv"
          title={t("reports.voided")}
          headers={[
            t("reports.colTable"),
            t("bill.total"),
            t("audit.reason"),
            t("reports.colOwner"),
            t("audit.time"),
          ]}
          rows={rows.map((r) => [
            r.tableLabel ?? t("tables.unlabeled"),
            r.total,
            r.reason ?? "",
            r.voidedBy ?? "",
            r.voidedAt ? formatBaghdadDateTime(r.voidedAt) : "",
          ])}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.colTable")}</TableHead>
            <TableHead>{t("bill.total")}</TableHead>
            <TableHead>{t("audit.reason")}</TableHead>
            <TableHead>{t("reports.colOwner")}</TableHead>
            <TableHead>{t("audit.time")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.billId}>
              <TableCell>{r.tableLabel ?? t("tables.unlabeled")}</TableCell>
              <TableCell>
                <MoneyBdi amount={r.total} />
              </TableCell>
              <TableCell className="max-w-[12rem]">{r.reason ?? "—"}</TableCell>
              <TableCell>{r.voidedBy ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap">
                {r.voidedAt ? formatBaghdadDateTime(r.voidedAt) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportSection>
  );
}
