"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  applyDiscount,
  payBill,
  removeDiscount,
  voidBill,
} from "@/actions/bills";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatOrderNumber } from "@/lib/format-datetime";
import { formatIQD } from "@/lib/money";
import { writeReceiptSnapshot } from "@/lib/cashier/receipt-snapshot";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { OrderItemLabel, QtyChip } from "@/components/shared/order-item-label";
import { t } from "@/lib/i18n/ar-iq";
import type { OrderStatus } from "@prisma/client";

type BillView = {
  id: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  discountType: "AMOUNT" | "PERCENT" | null;
  discountValue: number;
  discountReason: string | null;
  voidReason: string | null;
  total: number;
  tableLabel: string | null;
  orders: {
    id: string;
    dailyNumber: number;
    status: OrderStatus;
    items: {
      nameSnapshot: string;
      categorySnapshot: string;
      quantity: number;
      priceSnapshot: number;
      note: string | null;
    }[];
  }[];
  hasUnserved: boolean;
};

export function BillDetailClient({
  bill,
  canVoid = false,
}: {
  bill: BillView;
  canVoid?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const [discType, setDiscType] = useState<"AMOUNT" | "PERCENT">("PERCENT");
  const [discValue, setDiscValue] = useState(0);
  const [discReason, setDiscReason] = useState("");
  const [received, setReceived] = useState(bill.total);
  const [voidReason, setVoidReason] = useState("");
  const busy = pending || paying;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else {
        router.refresh();
        if (res.data && typeof res.data === "object" && "change" in res.data) {
          toast.success(
            `${t("bill.change")}: ${formatIQD((res.data as { change: number }).change)}`
          );
        }
      }
    });
  };

  const voidButton =
    canVoid && (bill.status === "OPEN" || bill.status === "PAID") ? (
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="destructive" className="h-11 w-full" disabled={pending}>
              {pending ? t("app.loading") : t("bill.voidAction")}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bill.voidAction")}</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-muted-foreground text-sm">{t("bill.voidConfirm")}</p>
          <Textarea
            placeholder={t("bill.voidReasonPlaceholder")}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="text-base"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("confirm.no")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() =>
                run(() =>
                  voidBill({ billId: bill.id, reason: voidReason.trim() })
                )
              }
            >
              {pending ? t("app.loading") : t("confirm.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ) : null;

  if (bill.status === "VOID") {
    return (
      <div className="space-y-4 p-4">
        <section className="overflow-hidden rounded-2xl border border-destructive/40 bg-card shadow-sm">
          <div className="bg-destructive h-1" aria-hidden />
          <div className="space-y-2 p-4">
            <p className="font-semibold text-destructive">{t("bill.void")}</p>
            {bill.voidReason ? (
              <p className="text-muted-foreground text-sm">
                {t("bill.voidReason")}: {bill.voidReason}
              </p>
            ) : null}
            <p className="text-xl font-semibold">
              <MoneyBdi amount={bill.total} />
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (bill.status === "PAID") {
    return (
      <div className="space-y-4 p-4">
        <section className="overflow-hidden rounded-2xl border border-emerald-500/40 bg-card shadow-sm">
          <div className="h-1 bg-emerald-500" aria-hidden />
          <div className="space-y-2 p-4">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
              {t("bill.paid")}
            </p>
            <p className="text-muted-foreground text-xs">
              {bill.tableLabel ?? t("tables.unlabeled")}
            </p>
            <p className="text-2xl font-bold">
              <MoneyBdi amount={bill.total} />
            </p>
          </div>
        </section>
        <Link
          href={`/cashier/bills/${bill.id}/receipt`}
          className={cn(
            buttonVariants(),
            "inline-flex h-11 w-full items-center justify-center bg-brand-amber font-semibold text-black hover:bg-brand-amber/90",
          )}
        >
          {t("bill.print")}
        </Link>
        {voidButton}
      </div>
    );
  }

  if (bill.status !== "OPEN") {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">{bill.status}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-36">
      <header className="overflow-hidden rounded-2xl border border-brand-gold/35 bg-card shadow-sm">
        <div className="h-1 bg-brand-gold" aria-hidden />
        <div className="flex items-start justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{t("tables.title")}</p>
            <h2 className="truncate text-2xl font-semibold leading-none">
              {bill.tableLabel
                ? t("tables.withLabel", { label: bill.tableLabel })
                : t("tables.unlabeled")}
            </h2>
          </div>
          <div className="shrink-0 text-end">
            <p className="text-muted-foreground text-xs">{t("bill.total")}</p>
            <p className="text-xl font-semibold">
              <MoneyBdi amount={bill.total} />
            </p>
          </div>
        </div>
      </header>

      {bill.orders.map((o) => (
        <section
          key={o.id}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <bdi dir="ltr" className="text-base font-semibold">
                {formatOrderNumber(o.dailyNumber)}
              </bdi>
              <OrderStatusBadge status={o.status} />
            </div>
          </div>
          <ul className="divide-y divide-border">
            {o.items.map((it, i) => (
              <li
                key={i}
                className="flex items-start gap-2 px-3.5 py-2.5 text-sm"
              >
                <QtyChip quantity={it.quantity} />
                <OrderItemLabel
                  name={it.nameSnapshot}
                  category={it.categorySnapshot}
                  note={it.note}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
        <p className="flex justify-between gap-2">
          <span className="text-muted-foreground">{t("bill.subtotal")}</span>
          <MoneyBdi amount={bill.subtotal} />
        </p>
        {bill.discountAmount > 0 ? (
          <p className="flex justify-between gap-2">
            <span className="text-muted-foreground">
              {bill.discountType === "PERCENT" && bill.discountValue > 0
                ? t("bill.discountWithPercent", { percent: bill.discountValue })
                : t("bill.discount")}
              {bill.discountReason ? ` — ${bill.discountReason}` : ""}
            </span>
            <MoneyBdi amount={bill.discountAmount} />
          </p>
        ) : null}
        <p className="flex justify-between gap-2 text-base font-bold">
          <span>{t("bill.total")}</span>
          <MoneyBdi amount={bill.total} />
        </p>
      </section>

      <div className="border-border bg-background/95 fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t backdrop-blur-md">
        <div className="mx-auto w-full max-w-5xl space-y-2 p-3">
        <div className="flex flex-wrap gap-2">
        <AlertDialog open={discOpen} onOpenChange={setDiscOpen}>
          <AlertDialogTrigger
            render={
              <Button variant="secondary" className="h-11">
                {t("bill.discount")}
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("bill.discount")}</AlertDialogTitle>
            </AlertDialogHeader>
            <Select
              value={discType}
              onValueChange={(v) => {
                if (v === "AMOUNT" || v === "PERCENT") setDiscType(v);
              }}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue>
                  {discType === "PERCENT"
                    ? t("bill.discountTypePercent")
                    : t("bill.discountTypeAmount")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT">{t("bill.discountTypePercent")}</SelectItem>
                <SelectItem value="AMOUNT">{t("bill.discountTypeAmount")}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              className="h-11 text-base"
              value={discValue || ""}
              onChange={(e) => setDiscValue(parseInt(e.target.value, 10) || 0)}
              placeholder={
                discType === "PERCENT"
                  ? t("bill.discountPercentPlaceholder")
                  : t("bill.discountAmountPlaceholder")
              }
            />
            <Textarea
              placeholder={t("bill.discountReasonPlaceholder")}
              value={discReason}
              onChange={(e) => setDiscReason(e.target.value)}
              className="text-base"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>{t("confirm.no")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                onClick={(e) => {
                  const reason = discReason.trim();
                  if (discValue <= 0) {
                    e.preventDefault();
                    toast.error(t("bill.discountTooSmall"));
                    return;
                  }
                  if (discType === "PERCENT" && discValue > 100) {
                    e.preventDefault();
                    toast.error(t("bill.discountPercentMax"));
                    return;
                  }
                  if (reason.length < 3) {
                    e.preventDefault();
                    toast.error(t("error.reasonShort"));
                    return;
                  }
                  e.preventDefault();
                  startTransition(async () => {
                    const res = await applyDiscount({
                      billId: bill.id,
                      type: discType,
                      value: discValue,
                      reason,
                    });
                    if (!res.ok) {
                      toast.error(res.error);
                      return;
                    }
                    setDiscOpen(false);
                    setDiscValue(0);
                    setDiscReason("");
                    router.refresh();
                  });
                }}
              >
                {pending ? t("app.loading") : t("confirm.yes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {bill.discountAmount > 0 && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  className="h-11"
                  disabled={pending}
                >
                  {pending ? t("app.loading") : t("bill.removeDiscount")}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("bill.removeDiscount")}</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>
                  {t("confirm.no")}
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={pending}
                  onClick={() =>
                    run(() => removeDiscount({ billId: bill.id }))
                  }
                >
                  {pending ? t("app.loading") : t("confirm.yes")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        </div>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              className="h-12 w-full bg-brand-amber text-base font-semibold text-black hover:bg-brand-amber/90"
              disabled={busy}
            >
              {busy ? t("app.loading") : t("bill.pay")}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader className="place-items-center text-center">
            <AlertDialogTitle className="text-lg font-semibold">
              {t("bill.pay")}
            </AlertDialogTitle>
          </AlertDialogHeader>
          {bill.hasUnserved && (
            <p className="text-destructive text-center text-sm">
              {t("warn.unserved")}
            </p>
          )}
          <div className="rounded-2xl bg-foreground/[0.06] px-4 py-3 text-center dark:bg-white/[0.07]">
            <p className="text-muted-foreground text-xs">{t("bill.total")}</p>
            <p className="mt-1 text-2xl font-bold leading-none">
              <MoneyBdi amount={bill.total} />
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-center text-xs">
              {t("bill.received")}
            </p>
            <Input
              type="number"
              dir="ltr"
              inputMode="numeric"
              className="h-12 rounded-xl text-center text-xl font-semibold tabular-nums"
              value={received || ""}
              placeholder={t("bill.receivedPlaceholder")}
              disabled={busy}
              onChange={(e) => setReceived(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[5000, 10000, 25000, 50000].map((n) => {
              const active = received === n;
              return (
                <Button
                  key={n}
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  className={cn(
                    "h-11 rounded-xl ring-1 ring-foreground/10 dark:bg-white/[0.06] dark:ring-white/15",
                    active &&
                      "bg-brand-amber text-black ring-brand-amber hover:bg-brand-amber/90",
                  )}
                  onClick={() => setReceived(n)}
                >
                  <MoneyBdi amount={n} />
                </Button>
              );
            })}
          </div>
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl px-4 py-3",
              received > 0 && received < bill.total
                ? "bg-destructive/10 text-destructive"
                : received > bill.total
                  ? "bg-brand-amber/15"
                  : "bg-foreground/[0.06] dark:bg-white/[0.07]",
            )}
          >
            <span className="min-w-0 text-sm font-medium">
              {received > 0 && received < bill.total
                ? t("bill.insufficientCash")
                : t("bill.change")}
            </span>
            <MoneyBdi
              amount={
                received > 0 && received < bill.total
                  ? bill.total - received
                  : Math.max(0, received - bill.total)
              }
              className="shrink-0 text-lg font-bold"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="w-full" disabled={busy}>
              {t("confirm.no")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 w-full rounded-xl bg-brand-amber font-semibold text-black hover:bg-brand-amber/90"
              disabled={busy}
              onClick={() => {
                if (received < bill.total) {
                  toast.error(t("bill.insufficientCash"));
                  return;
                }

                setPaying(true);
                startTransition(async () => {
                  const res = await payBill({
                    billId: bill.id,
                    receivedAmount: received,
                  });
                  if (!res.ok) {
                    setPaying(false);
                    toast.error(res.error);
                    return;
                  }
                  if (res.data.voided) {
                    toast.message(t("bill.autoVoidEmpty"));
                    router.replace("/cashier/bills");
                    return;
                  }

                  writeReceiptSnapshot({
                    id: bill.id,
                    tableLabel: bill.tableLabel,
                    subtotal: bill.subtotal,
                    discountAmount: bill.discountAmount,
                    discountType: bill.discountType,
                    discountValue: bill.discountValue,
                    total: bill.total,
                    paidAt: new Date().toISOString(),
                    received,
                    items: bill.orders.flatMap((o) =>
                      o.items.map((it) => ({
                        name: it.nameSnapshot,
                        category: it.categorySnapshot,
                        quantity: it.quantity,
                        lineTotal: it.priceSnapshot * it.quantity,
                      })),
                    ),
                  });

                  // بعد نجاح الدفع فقط — تجنّب قطع stream الإجراء
                  router.replace(`/cashier/bills/${bill.id}/receipt`);
                  toast.success(
                    `${t("bill.change")}: ${formatIQD(res.data.change)}`,
                  );
                });
              }}
            >
              {busy ? t("app.loading") : t("confirm.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {voidButton}
        </div>
      </div>

      {paying ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="bg-background/85 fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 backdrop-blur-sm"
        >
          <Loader2
            className="size-10 animate-spin text-brand-amber"
            aria-hidden
          />
          <p className="text-base font-semibold">{t("bill.paying")}</p>
          <p className="text-muted-foreground text-sm">{t("app.loading")}</p>
        </div>
      ) : null}
    </div>
  );
}
