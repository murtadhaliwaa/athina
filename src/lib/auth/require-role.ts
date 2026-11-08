import "server-only";

import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getCurrentProfile } from "@/lib/auth/guard";
import { roleHome } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export async function requireRolePage(allowed: Role[]) {
  const profile = await getCurrentProfile();
  if (!profile?.isActive) {
    // اكسر حلقة proxy: JWT صالح لكن الحساب موقوف → سجّل خروجاً ثم login
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    redirect("/login");
  }
  if (!allowed.includes(profile.role)) {
    redirect(roleHome(profile.role));
  }
  return profile;
}
