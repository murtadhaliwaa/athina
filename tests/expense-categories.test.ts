import { describe, expect, it } from "vitest";
import {
  EXPENSE_CATEGORY_IDS,
  isExpenseCategoryId,
} from "@/lib/expenses/categories";

describe("expense categories", () => {
  it("يقبل التصنيفات المعروفة فقط", () => {
    expect(isExpenseCategoryId("supplies")).toBe(true);
    expect(isExpenseCategoryId("other")).toBe(true);
    expect(isExpenseCategoryId("unknown")).toBe(false);
    expect(EXPENSE_CATEGORY_IDS).toHaveLength(4);
  });
});
