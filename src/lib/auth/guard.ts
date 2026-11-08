import "server-only";

import { cache } from "react";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { can, type Permission } from "@/lib/auth/permissions";
import { t } from "@/lib/i18n/ar-iq";
import { withTimeout } from "@/lib/with-timeout";

const profileSelect = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  isActive: true,
} as const;

async function resolveUserId(): Promise<string | null> {
  const supabase = await createClient();

  // getClaims يتحقق من JWT محلياً — أسرع بكثير من getUser على الموبايل
  try {
    const { data } = await withTimeout(supabase.auth.getClaims(), 1200);
    const sub = data?.claims?.sub;
    if (typeof sub === "string" && sub.length > 0) return sub;
  } catch {
    /* جرّب getUser */
  }

  try {
    const { data } = await withTimeout(supabase.auth.getUser(), 2000);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * قراءة الصفحة: مستخدم موثّق من Auth + بروفايل (مرة واحدة لكل طلب عبر cache).
 * للكتابة استخدم requireUser.
 */
export const getCurrentProfile = cache(async () => {
  const userId = await resolveUserId();
  if (!userId) return null;

  return prisma.profile.findUnique({
    where: { id: userId },
    select: profileSelect,
  });
});

/** للكتابة (Server Actions): تحقق من المستخدم مع Supabase Auth */
export async function requireUser(allowed: Role[]) {
  const supabase = await createClient();
  let userId: string | null = null;

  try {
    const { data } = await withTimeout(supabase.auth.getUser(), 2500);
    userId = data.user?.id ?? null;
  } catch {
    userId = await resolveUserId();
  }

  if (!userId) {
    throw new AppError("UNAUTHENTICATED", t("error.loginRequired"));
  }

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: profileSelect,
  });

  if (!profile?.isActive) {
    throw new AppError("INACTIVE", t("error.accountInactive"));
  }

  if (!allowed.includes(profile.role)) {
    throw new AppError("FORBIDDEN", t("error.noPermission"));
  }

  return profile;
}

/** بعد requireUser: تحقّق صلاحية دقيقة من خريطة permissions */
export function assertCan(
  role: Role,
  permission: Permission
): void {
  if (!can(role, permission)) {
    throw new AppError("FORBIDDEN", t("error.noPermission"));
  }
}
