import "server-only";

export { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/env-public";

/** service_role (قديم) أو secret (جديد) — خادم فقط */
export function getSupabaseServiceRoleKey() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ناقص — انسخه من Project Settings → API"
    );
  }
  return key;
}

export function getPinPepper() {
  const pepper = process.env.PIN_PEPPER;
  if (!pepper || pepper.length < 16) {
    throw new Error("PIN_PEPPER ناقص أو قصير جداً");
  }
  return pepper;
}
