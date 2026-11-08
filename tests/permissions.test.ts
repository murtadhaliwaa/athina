import { describe, expect, it } from "vitest";
import { can, type Permission } from "@/lib/auth/permissions";
import type { Role } from "@prisma/client";

const matrix: Array<[Role, Permission, boolean]> = [
  ["WAITER", "orders.create_dine_in", true],
  ["WAITER", "orders.cancel", false],
  ["WAITER", "orders.advance_status", false],
  ["WAITER", "orders.mark_served", true],
  ["WAITER", "orders.revert_status", false],
  ["WAITER", "bills.discount", false],
  ["WAITER", "bills.pay", false],
  ["WAITER", "bills.void", false],
  ["WAITER", "shifts.open_close", false],
  ["WAITER", "reports.view", false],
  ["WAITER", "menu.toggle_availability", false],
  ["WAITER", "orders.remove_item_own_new", true],
  ["CASHIER", "orders.create_dine_in", true],
  ["CASHIER", "orders.mark_served", true],
  ["CASHIER", "bills.discount", true],
  ["CASHIER", "bills.pay", true],
  ["CASHIER", "shifts.open_close", true],
  ["CASHIER", "menu.toggle_availability", true],
  ["CASHIER", "menu.manage", false],
  ["CASHIER", "reports.view", false],
  ["CASHIER", "bills.void", false],
  ["CASHIER", "shifts.view_difference", false],
  ["CASHIER", "staff.manage", false],
  ["CASHIER", "settings.manage", false],
  ["CASHIER", "audit.view", false],
  ["OWNER", "reports.view", true],
  ["OWNER", "bills.void", true],
  ["OWNER", "staff.manage", true],
  ["OWNER", "menu.manage", true],
  ["OWNER", "menu.toggle_availability", true],
  ["OWNER", "orders.mark_served", true],
  ["OWNER", "shifts.view_difference", true],
  ["OWNER", "audit.view", true],
  ["OWNER", "settings.manage", true],
];

describe("can(role, permission)", () => {
  it.each(matrix)("%s → %s = %s", (role, permission, expected) => {
    expect(can(role, permission)).toBe(expected);
  });
});
