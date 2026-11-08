import { notFound } from "next/navigation";
import { ReceiptClient } from "@/components/cashier/receipt-client";
import { getCafeSettings } from "@/lib/queries/settings";
import { prisma } from "@/lib/prisma";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bill, settings] = await Promise.all([
    prisma.bill.findUnique({
      where: { id },
      select: {
        id: true,
        subtotal: true,
        discountAmount: true,
        discountType: true,
        discountValue: true,
        total: true,
        paidAt: true,
        table: { select: { label: true } },
        orders: {
          select: {
            items: {
              where: { status: "ACTIVE" },
              select: {
                nameSnapshot: true,
                categorySnapshot: true,
                quantity: true,
                priceSnapshot: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { receivedAmount: true },
        },
      },
    }),
    getCafeSettings(),
  ]);

  if (!bill || !settings) notFound();

  const items = bill.orders.flatMap((o) => o.items);
  const payment = bill.payments[0];

  return (
    <ReceiptClient
      cafeName={settings.cafeName}
      phone={settings.phone}
      footer={settings.receiptFooter}
      bill={{
        id: bill.id,
        tableLabel: bill.table?.label ?? null,
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount,
        discountType: bill.discountType,
        discountValue: bill.discountValue,
        total: bill.total,
        paidAt: bill.paidAt?.toISOString() ?? null,
        items: items.map((i) => ({
          name: i.nameSnapshot,
          category: i.categorySnapshot,
          quantity: i.quantity,
          lineTotal: i.priceSnapshot * i.quantity,
        })),
        received: payment?.receivedAmount ?? bill.total,
      }}
    />
  );
}
