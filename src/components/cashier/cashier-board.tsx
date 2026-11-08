"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import {
  advanceOrderStatus,
  cancelOrder,
  clearCancelRequest,
  removeOrderItem,
  revertOrderStatus,
} from "@/actions/orders";
import { fetchCashierBoardOrders } from "@/actions/cashier-board";
import { nextStatus } from "@/lib/orders/transitions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useSound } from "@/hooks/use-sound";
import { useWakeLock } from "@/hooks/use-wake-lock";
import {
  PageHeader,
  PageHeaderActions,
} from "@/components/shared/page-header";
import { OrderItemLabel, QtyChip } from "@/components/shared/order-item-label";
import { formatOrderNumber } from "@/lib/format-datetime";
import { RelativeMins } from "@/components/shared/relative-mins";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";
import type { BoardOrder } from "@/types/orders";
import type { OrderStatus } from "@prisma/client";

export type { BoardOrder };

const TAB_STATUSES: {
  key: string;
  statuses: OrderStatus[];
  label: () => string;
}[] = [
  { key: "NEW", statuses: ["NEW"], label: () => t("status.NEW") },
  {
    key: "PREPARING",
    statuses: ["PREPARING"],
    label: () => t("status.PREPARING"),
  },
  { key: "READY", statuses: ["READY"], label: () => t("status.READY") },
  { key: "SERVED", statuses: ["SERVED"], label: () => t("cashier.tabServed") },
];

function advanceLabel(status: OrderStatus) {
  if (status === "NEW") return t("action.startPrep");
  if (status === "PREPARING") return t("action.markReady");
  if (status === "READY") return t("action.markServed");
  return "";
}

function CashierStatusStepper({
  tab,
  byTab,
  onTabChange,
}: {
  tab: string;
  byTab: Record<string, BoardOrder[]>;
  onTabChange: (key: string) => void;
}) {
  const activeIndex = TAB_STATUSES.findIndex((s) => s.key === tab);
  const progressPct =
    (Math.max(activeIndex, 0) / (TAB_STATUSES.length - 1)) * (100 - 100 / 4);

  return (
    <div
      role="tablist"
      className="bg-card border-border relative grid grid-cols-4 rounded-2xl border px-1.5 py-4 shadow-sm"
    >
      <div
        className="bg-muted-foreground/25 pointer-events-none absolute top-[2.65rem] start-[12.5%] end-[12.5%] h-0.5 rounded-full"
        aria-hidden
      />
      <div
        className="bg-brand-amber pointer-events-none absolute top-[2.65rem] h-0.5 rounded-full transition-[width] duration-200"
        style={{
          insetInlineStart: "12.5%",
          width: `${progressPct}%`,
        }}
        aria-hidden
      />
      {TAB_STATUSES.map((tabDef, index) => {
        const count = byTab[tabDef.key]?.length ?? 0;
        const reached = index <= activeIndex;
        const selected = tab === tabDef.key;

        return (
          <button
            key={tabDef.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onTabChange(tabDef.key)}
            className="relative z-10 flex flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                reached
                  ? "border-brand-amber bg-brand-amber text-black"
                  : "border-muted-foreground/40 text-muted-foreground bg-card",
              )}
            >
              <bdi dir="ltr">{index + 1}</bdi>
            </span>
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap",
                selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {tabDef.label()}
            </span>
            <bdi
              dir="ltr"
              className="text-muted-foreground text-xs leading-none font-semibold"
            >
              {count}
            </bdi>
          </button>
        );
      })}
    </div>
  );
}

function isStaleNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() > 10 * 60_000;
}

export function CashierBoard({
  initialOrders,
  cashierName,
  shiftOpen,
}: {
  initialOrders: BoardOrder[];
  cashierName: string;
  shiftOpen: boolean;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [tab, setTab] = useState("NEW");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{
    itemId: string;
    orderId: string;
  } | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const knownIds = useRef(new Set(initialOrders.map((o) => o.id)));
  const primed = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInflight = useRef(false);
  const { play, unlocked, enable } = useSound();
  useWakeLock(true);

  // تحديث خلفي بدون useTransition — حتى لا يتعطّل كل اللوحة أثناء Realtime
  const syncBoard = useCallback(() => {
    if (syncInflight.current || pendingId) return;
    syncInflight.current = true;
    void (async () => {
      try {
        const res = await fetchCashierBoardOrders();
        if (res.ok) setOrders(res.orders);
      } finally {
        syncInflight.current = false;
      }
    })();
  }, [pendingId]);

  // تحديث مركّز بدل router.refresh الذي يعيد تصيير الشجرة كاملة
  useRealtimeRefresh(["orders", "order_items", "bills"], syncBoard, {
    debounceMs: 700,
    backupMs: 120_000,
  });

  useEffect(() => {
    if (!primed.current) {
      for (const o of orders) knownIds.current.add(o.id);
      primed.current = true;
      return;
    }
    for (const o of orders) {
      if (!knownIds.current.has(o.id) && o.status === "NEW") {
        knownIds.current.add(o.id);
        play();
        setFlashId(o.id);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => {
          setFlashId((id) => (id === o.id ? null : id));
          flashTimerRef.current = null;
        }, 2500);
        toast.message(
          t("notify.newOrder", {
            table: o.tableLabel ?? t("tables.unlabeled"),
          }),
        );
        continue;
      }
      knownIds.current.add(o.id);
    }
  }, [orders, play]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const byTab = useMemo(() => {
    const map: Record<string, BoardOrder[]> = {};
    for (const tabDef of TAB_STATUSES) {
      map[tabDef.key] = orders.filter((o) =>
        tabDef.statuses.includes(o.status),
      );
    }
    return map;
  }, [orders]);

  const runOptimistic = (
    orderId: string,
    optimistic: (prev: BoardOrder[]) => BoardOrder[],
    fn: () => Promise<{ ok: boolean; error?: string }>,
  ) => {
    const snapshot = orders;
    setPendingId(orderId);
    setOrders(optimistic);
    startTransition(async () => {
      const res = await fn();
      setPendingId(null);
      if (!res.ok) {
        setOrders(snapshot);
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  const list = byTab[tab] ?? [];

  return (
    <div className="pb-4">
      <PageHeader
        title={t("cashier.board")}
        statusOk={shiftOpen}
        subtitle={`${cashierName} • ${shiftOpen ? t("shift.openStatus") : t("shift.closed")}`}
      />
      <PageHeaderActions>
        {unlocked ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-11 shrink-0 rounded-2xl"
            onClick={() => enable()}
            aria-label={t("cashier.soundOn")}
            title={t("cashier.soundOn")}
          >
            <Volume2 className="size-5" aria-hidden />
          </Button>
        ) : null}
      </PageHeaderActions>

      {!unlocked ? (
        <div className="px-4 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-brand-gold/50 text-sm font-medium text-brand-amber"
            onClick={() => enable()}
          >
            <VolumeX className="me-2 size-4" aria-hidden />
            {t("cashier.soundOff")}
          </Button>
        </div>
      ) : null}

      <div className="px-4 py-3">
        <CashierStatusStepper tab={tab} byTab={byTab} onTabChange={setTab} />
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground mx-4 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          {t("empty.orders")}
        </p>
      ) : (
        <ul className="space-y-3 px-4">
          {list.map((order) => {
            const stale = order.status === "NEW" && isStaleNew(order.createdAt);
            const advance = advanceLabel(order.status);
            const busy = pendingId === order.id;
            return (
              <li key={order.id}>
                <article
                  className={cn(
                    "bg-card border-border rounded-2xl border p-3.5 shadow-sm",
                    order.cancelRequestedAt && "border-destructive/60",
                    flashId === order.id &&
                      "animate-pulse border-brand-amber ring-2 ring-brand-amber/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold">
                        <bdi dir="ltr">
                          {formatOrderNumber(order.dailyNumber)}
                        </bdi>
                        {" • "}
                        {order.tableLabel
                          ? t("tables.withLabel", { label: order.tableLabel })
                          : t("tables.unlabeled")}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("cashier.loggedBy", { name: order.createdByName })}
                        {order.isFollowUp ? ` · ${t("order.followUp")}` : ""}
                        {order.cancelRequestedAt
                          ? ` · ${t("order.cancelPending")}`
                          : ""}
                      </p>
                    </div>
                    <RelativeMins
                      iso={order.createdAt}
                      mode="ago"
                      className={cn(
                        "shrink-0 text-xs font-medium",
                        stale ? "text-destructive" : "text-muted-foreground",
                      )}
                    />
                  </div>

                  <ul className="mt-3 space-y-2">
                    {order.items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <QtyChip quantity={it.quantity} />
                        <OrderItemLabel
                          className="flex-1"
                          name={it.nameSnapshot}
                          category={it.categorySnapshot}
                          note={it.note}
                        />
                        {editingOrderId === order.id &&
                        order.status !== "CANCELLED" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive size-11 shrink-0"
                            disabled={busy}
                            aria-label={t("action.removeItem")}
                            onClick={() => {
                              setRemoveReason("");
                              setRemoveTarget({
                                itemId: it.id,
                                orderId: order.id,
                              });
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3.5 flex items-center gap-2">
                    {advance ? (
                      <Button
                        className="h-11 min-h-11 min-w-0 flex-1 rounded-xl bg-brand-amber px-3 text-sm font-semibold text-black hover:bg-brand-amber/90"
                        disabled={busy}
                        onClick={() => {
                          const next = nextStatus(order.status);
                          if (!next) return;
                          // ابقَ في نفس التبويب — البطاقة تختفي من القائمة الحالية بعد التحديث
                          runOptimistic(
                            order.id,
                            (prev) =>
                              prev.map((o) =>
                                o.id === order.id ? { ...o, status: next } : o,
                              ),
                            () => advanceOrderStatus({ orderId: order.id }),
                          );
                        }}
                      >
                        {advance}
                      </Button>
                    ) : null}
                    <Link
                      href={`/cashier/bills/${order.billId}`}
                      className="bg-secondary text-secondary-foreground inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-semibold"
                    >
                      {t("cashier.openBill")}
                    </Link>
                    {(() => {
                      const canRevert =
                        order.status !== "NEW" &&
                        order.status !== "CANCELLED";
                      const canDismiss = Boolean(order.cancelRequestedAt);
                      const canCancel =
                        !order.cancelRequestedAt &&
                        order.status !== "CANCELLED" &&
                        order.status !== "SERVED";
                      const canEdit = order.status !== "CANCELLED";
                      if (!canRevert && !canDismiss && !canCancel && !canEdit) {
                        return null;
                      }
                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-11 shrink-0 rounded-xl"
                                disabled={busy}
                                aria-label={t("cashier.more")}
                              />
                            }
                          >
                            <MoreHorizontal className="size-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-auto min-w-48"
                          >
                            {canEdit ? (
                              <DropdownMenuItem
                                className="min-h-11 px-3"
                                onClick={() =>
                                  setEditingOrderId((id) =>
                                    id === order.id ? null : order.id,
                                  )
                                }
                              >
                                {editingOrderId === order.id
                                  ? t("cashier.doneEditItems")
                                  : t("cashier.editItems")}
                              </DropdownMenuItem>
                            ) : null}
                            {canRevert ? (
                              <DropdownMenuItem
                                className="min-h-11 px-3"
                                onClick={() => {
                                  const reason = t("cashier.revert");
                                  runOptimistic(
                                    order.id,
                                    (prev) => {
                                      const map: Record<
                                        string,
                                        OrderStatus
                                      > = {
                                        PREPARING: "NEW",
                                        READY: "PREPARING",
                                        SERVED: "READY",
                                      };
                                      const prevStatus = map[order.status];
                                      if (!prevStatus) return prev;
                                      return prev.map((o) =>
                                        o.id === order.id
                                          ? { ...o, status: prevStatus }
                                          : o,
                                      );
                                    },
                                    () =>
                                      revertOrderStatus({
                                        orderId: order.id,
                                        reason,
                                      }),
                                  );
                                }}
                              >
                                {t("cashier.revert")}
                              </DropdownMenuItem>
                            ) : null}
                            {canDismiss ? (
                              <DropdownMenuItem
                                className="min-h-11 px-3"
                                onClick={() =>
                                  runOptimistic(
                                    order.id,
                                    (prev) =>
                                      prev.map((o) =>
                                        o.id === order.id
                                          ? {
                                              ...o,
                                              cancelRequestedAt: null,
                                            }
                                          : o,
                                      ),
                                    () =>
                                      clearCancelRequest({
                                        orderId: order.id,
                                      }),
                                  )
                                }
                              >
                                {t("cashier.dismissCancel")}
                              </DropdownMenuItem>
                            ) : null}
                            {canCancel ? (
                              <DropdownMenuItem
                                variant="destructive"
                                className="min-h-11 px-3"
                                onClick={() => {
                                  setCancelReason("");
                                  setCancelTarget(order.id);
                                }}
                              >
                                {t("action.cancelOrder")}
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("action.cancelOrder")}</AlertDialogTitle>
          </AlertDialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={t("cashier.cancelReasonPlaceholder")}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("confirm.no")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || cancelReason.trim().length < 3}
              onClick={() => {
                if (!cancelTarget || cancelReason.trim().length < 3) return;
                const id = cancelTarget;
                const reason = cancelReason.trim();
                setCancelTarget(null);
                runOptimistic(
                  id,
                  (prev) => prev.filter((o) => o.id !== id),
                  () => cancelOrder({ orderId: id, reason }),
                );
              }}
            >
              {t("confirm.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("action.removeItem")}</AlertDialogTitle>
          </AlertDialogHeader>
          <Textarea
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            placeholder={t("cashier.removeReasonPlaceholder")}
            className="text-base"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("confirm.no")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || removeReason.trim().length < 3}
              onClick={() => {
                if (!removeTarget || removeReason.trim().length < 3) return;
                const target = removeTarget;
                const reason = removeReason.trim();
                setRemoveTarget(null);
                runOptimistic(
                  target.orderId,
                  (prev) =>
                    prev
                      .map((o) => {
                        if (o.id !== target.orderId) return o;
                        const items = o.items.filter(
                          (it) => it.id !== target.itemId,
                        );
                        if (items.length === 0) return null;
                        return { ...o, items };
                      })
                      .filter((o): o is BoardOrder => o !== null),
                  () =>
                    removeOrderItem({
                      orderItemId: target.itemId,
                      reason,
                    }),
                );
              }}
            >
              {t("confirm.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
