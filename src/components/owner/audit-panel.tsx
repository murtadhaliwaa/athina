"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ReportDateFilter } from "@/components/owner/reports/report-date-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { formatBaghdadDateTime } from "@/lib/format-datetime";
import { auditActionLabel, auditEntityLabel } from "@/lib/i18n/audit-label";
import { t } from "@/lib/i18n/ar-iq";

type LogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  actorName: string;
  createdAt: Date;
};

type Staff = { id: string; fullName: string };

const ENTITY_TYPES = [
  "Order",
  "OrderItem",
  "Bill",
  "Shift",
  "MenuItem",
  "Profile",
] as const;

const selectTriggerClass =
  "h-11 w-full rounded-xl border-0 bg-card text-foreground ring-1 ring-border";

export function AuditPanel({
  logs,
  staff,
}: {
  logs: LogRow[];
  staff: Staff[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") p.set(key, value);
    else p.delete(key);
    startTransition(() => router.push(`${pathname}?${p.toString()}`));
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-4 pt-3">
      <PageHeader title={t("nav.audit")} />

      <ReportDateFilter />

      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("audit.actor")}</Label>
          <Select
            disabled={pending}
            value={searchParams.get("actorId") ?? "all"}
            onValueChange={(v) => v != null && update("actorId", v)}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audit.allActors")}</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("audit.entityType")}
          </Label>
          <Select
            disabled={pending}
            value={searchParams.get("entityType") ?? "all"}
            onValueChange={(v) => v != null && update("entityType", v)}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audit.allTypes")}</SelectItem>
              {ENTITY_TYPES.map((et) => (
                <SelectItem key={et} value={et}>
                  {auditEntityLabel(et)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {logs.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {t("reports.empty")}
        </p>
      ) : (
        <div
          className={
            "overflow-x-auto rounded-2xl border border-border bg-card " +
            "[&_th]:h-11 [&_th]:px-3 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground " +
            "[&_td]:px-3 [&_td]:py-3 [&_td]:text-sm [&_td]:text-foreground " +
            "[&_tr]:border-brand-gold/10 [&_tr:hover]:bg-brand-gold/5"
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.time")}</TableHead>
                <TableHead>{t("audit.actor")}</TableHead>
                <TableHead>{t("audit.action")}</TableHead>
                <TableHead>{t("audit.entityType")}</TableHead>
                <TableHead>{t("audit.reason")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatBaghdadDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>{log.actorName}</TableCell>
                  <TableCell className="font-medium">
                    {auditActionLabel(log.action)}
                  </TableCell>
                  <TableCell>{auditEntityLabel(log.entityType)}</TableCell>
                  <TableCell className="max-w-[14rem] truncate text-muted-foreground">
                    {log.reason ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
