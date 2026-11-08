import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "orders.view_all",
  "orders.create_dine_in",
  "orders.add_items",
  "orders.remove_item_own_new",
  "orders.remove_item_any",
  "orders.request_cancel",
  "orders.cancel",
  "orders.advance_status",
  "orders.mark_served",
  "orders.revert_status",
  "bills.discount",
  "bills.pay",
  "bills.void",
  "shifts.open_close",
  "shifts.view_difference",
  "menu.manage",
  "menu.toggle_availability",
  "tables.manage",
  "staff.manage",
  "reports.view",
  "audit.view",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  WAITER: [
    "orders.view_all",
    "orders.create_dine_in",
    "orders.add_items",
    "orders.remove_item_own_new",
    "orders.request_cancel",
    "orders.mark_served",
  ],
  CASHIER: [
    "orders.view_all",
    "orders.create_dine_in",
    "orders.add_items",
    "orders.remove_item_any",
    "orders.cancel",
    "orders.advance_status",
    "orders.mark_served",
    "orders.revert_status",
    "bills.discount",
    "bills.pay",
    "shifts.open_close",
    "menu.toggle_availability",
  ],
  OWNER: [...PERMISSIONS],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function roleHome(role: Role): string {
  switch (role) {
    case "OWNER":
      return "/owner";
    case "CASHIER":
      return "/cashier";
    case "WAITER":
      return "/waiter";
  }
}
