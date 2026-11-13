import {
  EXPENSE_CATEGORY_IDS,
  type ExpenseCategoryId,
} from "@/lib/expenses/categories";
import { t, type ArIqKey } from "@/lib/i18n/ar-iq";

const CATEGORY_KEYS: Record<ExpenseCategoryId, ArIqKey> = {
  supplies: "expense.category.supplies",
  maintenance: "expense.category.maintenance",
  utilities: "expense.category.utilities",
  other: "expense.category.other",
};

export function expenseCategoryLabel(category: string): string {
  if ((EXPENSE_CATEGORY_IDS as readonly string[]).includes(category)) {
    return t(CATEGORY_KEYS[category as ExpenseCategoryId]);
  }
  return category;
}
