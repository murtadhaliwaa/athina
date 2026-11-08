import type { OrderStatus } from "@prisma/client";

/** بطاقة طلب في لوحة الكاشير */
export type BoardOrder = {
  id: string;
  dailyNumber: number;
  status: OrderStatus;
  type: string;
  isFollowUp: boolean;
  cancelRequestedAt: string | null;
  createdAt: string;
  tableLabel: string | null;
  createdByName: string;
  billId: string;
  items: {
    id: string;
    nameSnapshot: string;
    categorySnapshot: string;
    quantity: number;
    note: string | null;
  }[];
};

export type { ReadyOrderBrief } from "@/actions/waiter-ready";
export type { OrderLineInput } from "@/lib/orders/menu-lines";
