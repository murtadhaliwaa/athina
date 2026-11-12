import { notFound } from "next/navigation";
import { BillDetailClient } from "@/components/cashier/bill-detail-client";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentProfile } from "@/lib/auth/guard";
import { DEMO_BILL_ID, demoBill } from "@/lib/cashier/demo-bill";
import {
  countActiveWaterOnBill,
  findWaterMenuItem,
} from "@/lib/billing/water";
import { isOrderStillPreparing } from "@/lib/orders/bill-ready";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n/ar-iq";

export default async function CashierBillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === DEMO_BILL_ID) {
    if (process.env.NODE_ENV === "production") notFound();
    return (
      <div>
        <PageHeader title={t("bill.detail")} />
        <BillDetailClient canVoid={false} bill={demoBill} />
      </div>
    );
  }

  const [profile, bill, waterItem] = await Promise.all([
    getCurrentProfile(),
    prisma.bill.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        subtotal: true,
        discountAmount: true,
        discountType: true,
        discountValue: true,
        discountReason: true,
        voidReason: true,
        total: true,
        guestCount: true,
        table: { select: { label: true } },
        orders: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { dailyNumber: "asc" },
          select: {
            id: true,
            dailyNumber: true,
            status: true,
            items: {
              where: { status: "ACTIVE" },
              select: {
                nameSnapshot: true,
                categorySnapshot: true,
                quantity: true,
                priceSnapshot: true,
                note: true,
              },
            },
          },
        },
      },
    }),
    findWaterMenuItem(prisma),
  ]);

  if (!bill) notFound();

  // تنبيه إن بقي تحضير — READY/SERVED ما يمنعون الدفع
  const hasUnserved = bill.orders.some((o) =>
    isOrderStillPreparing(o.status),
  );

  const currentWaterQty = waterItem
    ? await countActiveWaterOnBill(prisma, bill.id, waterItem.id)
    : 0;

  return (
    <div>
      <PageHeader title={t("bill.detail")} />
      <BillDetailClient
        canVoid={profile?.role === "OWNER"}
        bill={{
          id: bill.id,
          status: bill.status,
          subtotal: bill.subtotal,
          discountAmount: bill.discountAmount,
          discountType: bill.discountType,
          discountValue: bill.discountValue,
          discountReason: bill.discountReason,
          voidReason: bill.voidReason,
          total: bill.total,
          tableLabel: bill.table?.label ?? null,
          guestCount: bill.guestCount,
          waterAvailable: Boolean(waterItem),
          waterPrice: waterItem?.price ?? 0,
          waterCategory: waterItem?.category.name ?? null,
          currentWaterQty,
          hasUnserved,
          orders: bill.orders.map((o) => ({
            id: o.id,
            dailyNumber: o.dailyNumber,
            status: o.status,
            items: o.items.map((it) => ({
              nameSnapshot: it.nameSnapshot,
              categorySnapshot: it.categorySnapshot,
              quantity: it.quantity,
              priceSnapshot: it.priceSnapshot,
              note: it.note,
            })),
          })),
        }}
      />
    </div>
  );
}
