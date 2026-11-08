import { t, type ArIqKey } from "@/lib/i18n/ar-iq";
import type { Role } from "@prisma/client";

const ROLE_KEYS: Record<Role, ArIqKey> = {
  WAITER: "role.WAITER",
  CASHIER: "role.CASHIER",
  OWNER: "role.OWNER",
};

export function roleLabel(role: Role | string): string {
  const key = ROLE_KEYS[role as Role];
  return key ? t(key) : role;
}
