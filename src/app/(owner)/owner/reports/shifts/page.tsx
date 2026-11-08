import { getShiftsReport } from "@/actions/reports";
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
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

export default async function ShiftsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const rows = await getShiftsReport(rangeFromSearchParams(sp));

  return (
    <ReportSection
      title={t("reports.shifts")}
      empty={rows.length === 0}
      export={
        <ReportExportButtons
          filename="shifts.csv"
          title={t("reports.shifts")}
          headers={[
            t("reports.colOpenedBy"),
            t("reports.colOpeningCash"),
            t("reports.colExpected"),
            t("reports.colCounted"),
            t("reports.colDifference"),
            t("reports.colClosedAt"),
          ]}
          rows={rows.map((r) => [
            r.openedBy,
            r.openingCash,
            r.expectedCash ?? "",
            r.countedCash ?? "",
            r.difference ?? "",
            r.closedAt ? formatBaghdadDateTime(r.closedAt) : "",
          ])}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.colOpenedBy")}</TableHead>
            <TableHead>{t("reports.colOpeningCash")}</TableHead>
            <TableHead>{t("reports.colExpected")}</TableHead>
            <TableHead>{t("reports.colCounted")}</TableHead>
            <TableHead>{t("reports.colDifference")}</TableHead>
            <TableHead>{t("reports.colClosedAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.openedBy}</TableCell>
              <TableCell>
                <MoneyBdi amount={r.openingCash} />
              </TableCell>
              <TableCell>
                {r.expectedCash != null ? (
                  <MoneyBdi amount={r.expectedCash} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                {r.countedCash != null ? (
                  <MoneyBdi amount={r.countedCash} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell
                className={cn(
                  r.difference != null &&
                    r.difference < 0 &&
                    "font-medium text-red-400",
                  r.difference != null &&
                    r.difference > 0 &&
                    "font-medium text-brand-amber",
                )}
              >
                {r.difference != null ? (
                  <MoneyBdi amount={r.difference} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {r.closedAt ? formatBaghdadDateTime(r.closedAt) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportSection>
  );
}
