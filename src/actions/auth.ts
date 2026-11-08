"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { derivePassword, staffEmail } from "@/lib/auth/pin";
import { roleHome } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { t } from "@/lib/i18n/ar-iq";
import type { Role } from "@prisma/client";

/** مزامنة دور JWT مع profiles حتى يطابق proxy/RLS التوجيه */
async function syncAuthRole(
  userId: string,
  role: Role,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const admin = createAdminClient();
  try {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    });
    if (error) throw error;
    // حد زمني — لا نعلّق دخول الموبايل على refresh بطيء
    await Promise.race([
      supabase.auth.refreshSession(),
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch (e) {
    console.error("syncAuthRole failed", e);
  }
}

const pinLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/),
  pin: z.string().regex(/^\d{6}$/),
});

const ownerLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const LOCK_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  );
}

async function isLocked(username: string) {
  const since = new Date(Date.now() - LOCK_WINDOW_MS);
  const recent = await prisma.loginAttempt.findMany({
    where: { username, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  const lastSuccessIdx = recent.findIndex((a) => a.success);
  const failures =
    lastSuccessIdx === -1 ? recent : recent.slice(0, lastSuccessIdx);

  return failures.filter((a) => !a.success).length >= MAX_FAILURES;
}

export async function loginWithPin(input: {
  username: string;
  pin: string;
}): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = pinLoginSchema.safeParse(input);
  if (!parsed.success) {
    return fail(t("auth.error"));
  }

  const { username, pin } = parsed.data;
  const ip = await clientIp();

  if (await isLocked(username)) {
    return fail(t("auth.locked"));
  }

  const profile = await prisma.profile.findUnique({ where: { username } });
  if (!profile || !profile.isActive || profile.role === "OWNER") {
    await prisma.loginAttempt.create({
      data: { username, ip, success: false },
    });
    return fail(t("auth.error"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: staffEmail(username),
    password: derivePassword(username, pin),
  });

  if (error || !data.user) {
    await prisma.loginAttempt.create({
      data: { username, ip, success: false },
    });
    return fail(t("auth.error"));
  }

  await syncAuthRole(data.user.id, profile.role, supabase);

  await prisma.loginAttempt.create({
    data: { username, ip, success: true },
  });

  return ok({ redirectTo: roleHome(profile.role) });
}

export async function loginOwner(input: {
  email: string;
  password: string;
}): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = ownerLoginSchema.safeParse(input);
  if (!parsed.success) {
    return fail(t("auth.error"));
  }

  const { email, password } = parsed.data;
  const ip = await clientIp();
  const lockKey = email.toLowerCase();

  if (await isLocked(lockKey)) {
    return fail(t("auth.locked"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    await prisma.loginAttempt.create({
      data: { username: lockKey, ip, success: false },
    });
    return fail(t("auth.error"));
  }

  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
  });

  if (!profile?.isActive || profile.role !== "OWNER") {
    await supabase.auth.signOut();
    await prisma.loginAttempt.create({
      data: { username: lockKey, ip, success: false },
    });
    return fail(t("auth.error"));
  }

  await syncAuthRole(data.user.id, profile.role, supabase);

  await prisma.loginAttempt.create({
    data: { username: lockKey, ip, success: true },
  });

  return ok({ redirectTo: roleHome(profile.role) });
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
