import "server-only";

import { cache } from "react";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { can, type Permission } from "@/lib/auth/permissions";
import { t } from "@/lib/i18n/ar-iq";

const profileSelect = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  isActive: true,
} as const;

/**
 * قراءة الصفحة: مستخدم موثّق من Auth + بروفايل (مرة واحدة لكل طلب عبر cache).
 * للكتابة استخدم requireUser.
 */
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.profile.findUnique({
    where: { id: user.id },
    select: profileSelect,
  });
});

/** للكتابة (Server Actions): تحقق من المستخدم مع Supabase Auth */
export async function requireUser(allowed: Role[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError("UNAUTHENTICATED", t("error.loginRequired"));
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
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
