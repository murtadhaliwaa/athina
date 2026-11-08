"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatIQD } from "@/lib/money";
import {
  takeReceiptSnapshot,
  type ReceiptSnapshot,
} from "@/lib/cashier/receipt-snapshot";
import { MoneyBdi } from "@/components/shared/money-bdi";
import {
  formatBaghdadDateOnly,
  formatBaghdadTimeParts,
} from "@/lib/time";
import { t } from "@/lib/i18n/ar-iq";
import { Button } from "@/components/ui/button";

function receiptShareTime(paidAt: Date): string {
  const { period, clock } = formatBaghdadTimeParts(paidAt);
  return `${period} ${clock}`;
}

export function ReceiptClient({
  cafeName,
  phone,
  footer,
  bill: serverBill,
}: {
  cafeName: string;
  phone: string | null;
  footer: string | null;
  bill: ReceiptSnapshot;
}) {
  const [bill, setBill] = useState(serverBill);

  // لقطة محلية بعد التركيب فقط — تجنّب setState متزامن في الأثر
  useEffect(() => {
    const id = window.setTimeout(() => {
      const snap = takeReceiptSnapshot(serverBill.id);
      if (snap) setBill(snap);
    }, 0);
    return () => window.clearTimeout(id);
  }, [serverBill.id]);

  const discountLabel =
    bill.discountType === "PERCENT" && bill.discountValue > 0
      ? t("bill.discountWithPercent", { percent: bill.discountValue })
      : t("bill.discount");
  const shortId = bill.id.slice(-6);
  const paidAt = bill.paidAt ? new Date(bill.paidAt) : null;
  const paidTime = paidAt ? formatBaghdadTimeParts(paidAt) : null;
  const tableLine = t("bill.tableNumber", {
    label: bill.tableLabel ?? t("tables.unlabeled"),
  });
  const change = Math.max(0, bill.received - bill.total);

  const shareText = [
    cafeName,
    `B-${shortId}`,
    paidAt ? formatBaghdadDateOnly(paidAt) : "",
    paidAt ? receiptShareTime(paidAt) : "",
    tableLine,
    ...bill.items.map((i) => {
      const cat = i.category?.trim();
      const label = cat ? `${cat} · ${i.name}` : i.name;
      return `${label} × ${i.quantity} = ${formatIQD(i.lineTotal)}`;
    }),
    `${t("bill.total")}: ${formatIQD(bill.total)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const onShare = async () => {
    if (navigator.share) {
      await navigator.share({ text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success(t("bill.copied"));
    }
  };

  return (
    <div className="mx-auto max-w-[80mm] space-y-4 p-4 pb-24">
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html {
            color-scheme: light !important;
          }
          body * {
            visibility: hidden !important;
          }
          .receipt,
          .receipt * {
            visibility: visible !important;
          }
          .receipt {
            position: absolute;
            inset-inline-start: 0;
            top: 0;
            width: 80mm;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt hr {
            border-color: #000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <article className="receipt rounded-2xl border border-border bg-white p-4 text-black shadow-sm">
        <h1 className="text-center text-lg font-bold text-black">{cafeName}</h1>
        <div className="mt-2 space-y-0.5 text-center text-sm text-black">
          <p>
            <bdi dir="ltr">B-{shortId}</bdi>
          </p>
          {paidAt && paidTime ? (
            <>
              <p>
                <bdi dir="ltr">{formatBaghdadDateOnly(paidAt)}</bdi>
              </p>
              <p
                dir="ltr"
                className="inline-flex w-full items-center justify-center gap-1"
              >
                <span>{paidTime.period}</span>
                <span>{paidTime.clock}</span>
              </p>
            </>
          ) : null}
          <p>{tableLine}</p>
        </div>
        <hr className="my-2 border-black/40" />
        <ul className="space-y-1 text-sm text-black">
          {bill.items.map((i, idx) => {
            const cat = i.category?.trim();
            return (
              <li key={idx} className="flex justify-between gap-2">
                <span>
                  {cat ? (
                    <span className="block text-xs text-black/70">{cat}</span>
                  ) : null}
                  {i.name} × <bdi dir="ltr">{i.quantity}</bdi>
                </span>
                <MoneyBdi amount={i.lineTotal} />
              </li>
            );
          })}
        </ul>
        <hr className="my-2 border-black/40" />
        <p className="flex justify-between text-sm text-black">
          <span>{t("bill.subtotal")}</span>
          <MoneyBdi amount={bill.subtotal} />
        </p>
        {bill.discountAmount > 0 ? (
          <p className="flex justify-between text-sm text-black">
            <span>{discountLabel}</span>
            <MoneyBdi amount={bill.discountAmount} />
          </p>
        ) : null}
        <p className="flex justify-between font-bold text-black">
          <span>{t("bill.total")}</span>
          <MoneyBdi amount={bill.total} />
        </p>
        <p className="flex justify-between text-sm text-black">
          <span>{t("bill.received")}</span>
          <MoneyBdi amount={bill.received} />
        </p>
        <p className="flex justify-between text-sm text-black">
          <span>{t("bill.change")}</span>
          <MoneyBdi amount={change} />
        </p>
        {phone ? (
          <p className="mt-4 text-center text-sm text-black">
            <bdi dir="ltr">
              {phone
                .split(/\n|,/)
                .map((p) => p.trim())
                .filter(Boolean)
                .join("  ·  ")}
            </bdi>
          </p>
        ) : null}
        {footer ? (
          <p className="mt-2 text-center text-sm text-black">{footer}</p>
        ) : null}
      </article>

      <div className="no-print flex flex-col gap-2">
        <Button
          className="h-11 bg-brand-amber font-semibold text-black hover:bg-brand-amber/90"
          onClick={() => window.print()}
        >
          {t("bill.print")}
        </Button>
        <Button variant="secondary" className="h-11" onClick={onShare}>
          {t("bill.share")}
        </Button>
      </div>
    </div>
  );
}
