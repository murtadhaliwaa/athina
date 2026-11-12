"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OrderStatus } from "@prisma/client";
import {
  adjustOrderItemQuantity,
  advanceOrderStatus,
  requestCancelOrder,
} from "@/actions/orders";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { QtyStepper } from "@/components/shared/qty-stepper";
import { nextOrderItemQty } from "@/lib/orders/qty";
import { t } from "@/lib/i18n/ar-iq";

/** +/− لتعديل كمية صنف الويتر في طلب NEW — التنقيص من 1 يحذف */
export function ItemQtyControls({
  orderItemId,
  quantity,
}: {
  orderItemId: string;
  quantity: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const applyQty = (next: number) => {
    startTransition(async () => {
      const res = await adjustOrderItemQuantity({
        orderItemId,
        quantity: next,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (next > 0) toast.success(t("order.qtyUpdated"));
      setConfirmOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <QtyStepper
        quantity={quantity}
        disabled={pending}
        decreaseLabel={
          quantity <= 1 ? t("action.removeItem") : t("action.decreaseQty")
        }
        onDecrease={() => {
          if (quantity <= 1) {
            setConfirmOpen(true);
            return;
          }
          applyQty(nextOrderItemQty(quantity, -1));
        }}
        onIncrease={() => applyQty(nextOrderItemQty(quantity, 1))}
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("action.removeItem")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2">
            <AlertDialogCancel disabled={pending}>
              {t("confirm.no")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => applyQty(0)}
            >
              {pending ? t("app.loading") : t("confirm.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TableDetailActions({
  tableId,
  orderId,
  status,
}: {
  tableId: string;
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="bg-muted/30 flex flex-wrap gap-2 border-t border-border p-3">
      {status === "READY" ? (
        <Button
          className="h-11 min-h-11 flex-[1.4] bg-brand-amber font-semibold text-black hover:bg-brand-amber/90"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await advanceOrderStatus({ orderId });
              if (!res.ok) toast.error(res.error);
              else {
                toast.success(t("status.SERVED"));
                router.refresh();
              }
            })
          }
        >
          {pending ? t("app.loading") : t("action.markServed")}
        </Button>
      ) : (
        <Link
          href={`/waiter/new?table=${tableId}`}
          className={cn(
            buttonVariants(),
            "inline-flex h-11 min-h-11 flex-[1.4] items-center justify-center bg-brand-amber px-4 text-base font-semibold text-black hover:bg-brand-amber/90",
          )}
        >
          {t("order.addItems")}
        </Link>
      )}

      {status === "READY" ? (
        <Link
          href={`/waiter/new?table=${tableId}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-11 min-h-11 flex-1 items-center justify-center px-3 text-sm font-medium",
          )}
        >
          {t("order.addItems")}
        </Link>
      ) : null}

      {status !== "SERVED" && status !== "CANCELLED" ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="destructive"
                className="h-11 min-h-11 flex-1"
                disabled={pending}
              >
                {pending ? t("app.loading") : t("action.requestCancel")}
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirm.areYouSure")}</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-2">
              <AlertDialogCancel>{t("confirm.no")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await requestCancelOrder({ orderId });
                    if (!res.ok) toast.error(res.error);
                    else router.refresh();
                  })
                }
              >
                {pending ? t("app.loading") : t("confirm.yes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

export function MarkServedButton({
  orderId,
  compact = false,
}: {
  orderId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      className={
        compact
          ? "h-11 shrink-0 rounded-xl bg-brand-amber px-3 text-sm font-semibold text-black hover:bg-brand-amber/90"
          : "h-11 w-full rounded-xl bg-brand-amber font-semibold text-black hover:bg-brand-amber/90"
      }
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await advanceOrderStatus({ orderId });
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(t("status.SERVED"));
            router.refresh();
          }
        })
      }
    >
      {pending ? t("app.loading") : t("action.markServed")}
    </Button>
  );
}
