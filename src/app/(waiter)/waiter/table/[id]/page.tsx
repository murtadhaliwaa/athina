import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/guard";
import {
  ItemQtyControls,
  TableDetailActions,
} from "@/components/waiter/table-detail-actions";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { prisma } from "@/lib/prisma";
import {
  formatBaghdadDateTime,
  formatOrderNumber,
} from "@/lib/format-datetime";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { OrderItemLabel, QtyChip } from "@/components/shared/order-item-label";
import { PageHeader } from "@/components/shared/page-header";
import { formatIQD } from "@/lib/money";
import { t } from "@/lib/i18n/ar-iq";

export default async function WaiterTablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, table] = await Promise.all([
    getCurrentProfile(),
    prisma.cafeTable.findUnique({
      where: { id },
      select: { id: true, label: true },
    }),
  ]);
  if (!table) notFound();

  const bill = await prisma.bill.findFirst({
    where: { tableId: id, status: "OPEN" },
    select: {
      id: true,
      total: true,
      orders: {
        // كل طلبات الفاتورة المفتوحة — بلا فلتر يوم العمل
        where: { status: { not: "CANCELLED" } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          dailyNumber: true,
          status: true,
          createdAt: true,
          createdBy: { select: { fullName: true } },
          items: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              nameSnapshot: true,
              categorySnapshot: true,
              quantity: true,
              priceSnapshot: true,
              note: true,
              addedById: true,
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-4 p-4 pb-8 pt-3">
      <PageHeader
        title={t("tables.withLabel", { label: table.label })}
        subtitle={
          bill
            ? `${t("bill.total")}: ${formatIQD(bill.total)}`
            : t("tables.title")
        }
      />
      {bill ? (
        <div className="overflow-hidden rounded-2xl border border-brand-gold/35 bg-card shadow-sm">
          <div className="h-1 bg-brand-gold" aria-hidden />
          <div className="flex items-start justify-between gap-3 px-4 py-3.5">
            <p className="text-muted-foreground text-sm">{t("bill.total")}</p>
            <p className="text-xl font-semibold leading-none">
              <MoneyBdi amount={bill.total} />
            </p>
          </div>
        </div>
      ) : null}

      {!bill || bill.orders.length === 0 ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm">
          {t("empty.orders")}
        </p>
      ) : (
        bill.orders.map((order) => (
          <section
            key={order.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <bdi dir="ltr" className="text-base font-semibold">
                  {formatOrderNumber(order.dailyNumber)}
                </bdi>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-muted-foreground text-xs">
                {order.createdBy.fullName} ·{" "}
                {formatBaghdadDateTime(order.createdAt)}
              </p>
            </div>

            <ul className="divide-y divide-border">
              {order.items.map((item) => {
                const canEditQty =
                  Boolean(profile) &&
                  item.addedById === profile?.id &&
                  order.status === "NEW";
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-3.5 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <OrderItemLabel
                        name={item.nameSnapshot}
                        category={item.categorySnapshot}
                        note={item.note}
                      />
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        <MoneyBdi
                          amount={item.priceSnapshot * item.quantity}
                        />
                      </p>
                    </div>
                    {canEditQty ? (
                      <ItemQtyControls
                        orderItemId={item.id}
                        quantity={item.quantity}
                      />
                    ) : (
                      <QtyChip quantity={item.quantity} />
                    )}
                  </li>
                );
              })}
            </ul>

            {order.status !== "CANCELLED" ? (
              <TableDetailActions
                tableId={table.id}
                orderId={order.id}
                status={order.status}
              />
            ) : null}
          </section>
        ))
      )}
    </div>
  );
}
