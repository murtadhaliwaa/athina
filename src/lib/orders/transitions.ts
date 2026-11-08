import type { OrderStatus } from "@prisma/client";

/** تقدم يدوي للكاشير حتى تم التقديم (الدفع أيضاً يضع SERVED للأمان) */
const FORWARD: Record<OrderStatus, OrderStatus | null> = {
  NEW: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
  SERVED: null,
  CANCELLED: null,
};

const BACKWARD: Record<OrderStatus, OrderStatus | null> = {
  NEW: null,
  PREPARING: "NEW",
  READY: "PREPARING",
  SERVED: "READY",
  CANCELLED: null,
};

export function nextStatus(current: OrderStatus): OrderStatus | null {
  return FORWARD[current];
}

export function prevStatus(current: OrderStatus): OrderStatus | null {
  return BACKWARD[current];
}

export function canAdvance(current: OrderStatus): boolean {
  return FORWARD[current] !== null;
}

export function canRevert(current: OrderStatus): boolean {
  return BACKWARD[current] !== null;
}
