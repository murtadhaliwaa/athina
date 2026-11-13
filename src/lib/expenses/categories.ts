/** تصنيفات مصروفات المالك — ثابتة وبسيطة */
export const EXPENSE_CATEGORY_IDS = [
  "supplies",
  "maintenance",
  "utilities",
  "other",
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORY_IDS)[number];

export function isExpenseCategoryId(
  value: string,
): value is ExpenseCategoryId {
  return (EXPENSE_CATEGORY_IDS as readonly string[]).includes(value);
}
