import type { OrderStatus } from "@prisma/client";

/** فاتورة وهمية لمعاينة الواجهة — `/cashier/bills/demo` */
export const DEMO_BILL_ID = "demo";

export const demoBill = {
  id: DEMO_BILL_ID,
  status: "OPEN",
  subtotal: 52_000,
  discountAmount: 5_200,
  discountType: "PERCENT" as const,
  discountValue: 10,
  discountReason: "زبون دائم",
  voidReason: null as string | null,
  total: 46_800,
  tableLabel: "5",
  hasUnserved: true,
  orders: [
    {
      id: "demo-order-1",
      dailyNumber: 12,
      status: "READY" as OrderStatus,
      items: [
        {
          nameSnapshot: "أيس لاتيه",
          categorySnapshot: "مشروبات باردة",
          quantity: 2,
          priceSnapshot: 5_000,
          note: "بدون سكر",
        },
        {
          nameSnapshot: "تشيز كيك",
          categorySnapshot: "حلويات",
          quantity: 1,
          priceSnapshot: 7_000,
          note: null,
        },
        {
          nameSnapshot: "ماء",
          categorySnapshot: "مشروبات",
          quantity: 2,
          priceSnapshot: 1_000,
          note: null,
        },
      ],
    },
    {
      id: "demo-order-2",
      dailyNumber: 18,
      status: "PREPARING" as OrderStatus,
      items: [
        {
          nameSnapshot: "هوكا تفاح",
          categorySnapshot: "أراكيل",
          quantity: 1,
          priceSnapshot: 15_000,
          note: "ثلج زيادة",
        },
        {
          nameSnapshot: "شاي نعناع",
          categorySnapshot: "مشروبات حارة",
          quantity: 3,
          priceSnapshot: 2_000,
          note: null,
        },
        {
          nameSnapshot: "فطور عراقي",
          categorySnapshot: "أكل",
          quantity: 1,
          priceSnapshot: 12_000,
          note: "بيض مسلوق",
        },
      ],
    },
  ],
};
