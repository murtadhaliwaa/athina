/** لقطة إيصال محلية — تظهر فوراً بينما يكتمل الدفع على السيرفر */

export const RECEIPT_SNAPSHOT_KEY = (billId: string) =>
  `cafe_receipt_v1:${billId}`;

export type ReceiptSnapshot = {
  id: string;
  tableLabel: string | null;
  subtotal: number;
  discountAmount: number;
  discountType: "AMOUNT" | "PERCENT" | null;
  discountValue: number;
  total: number;
  paidAt: string | null;
  received: number;
  items: {
    name: string;
    category?: string | null;
    quantity: number;
    lineTotal: number;
  }[];
};

export function writeReceiptSnapshot(snap: ReceiptSnapshot) {
  try {
    sessionStorage.setItem(RECEIPT_SNAPSHOT_KEY(snap.id), JSON.stringify(snap));
  } catch {
    /* تجاهل */
  }
}

export function takeReceiptSnapshot(billId: string): ReceiptSnapshot | null {
  try {
    const key = RECEIPT_SNAPSHOT_KEY(billId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as ReceiptSnapshot;
  } catch {
    return null;
  }
}
