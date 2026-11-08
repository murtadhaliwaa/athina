"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { derivePassword, staffEmail } from "@/lib/auth/pin";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { ok, fail, type ActionResult } from "@/lib/errors";
import { handleAction } from "@/actions/helpers";
import { t } from "@/lib/i18n/ar-iq";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/);
const pinSchema = z.string().regex(/^\d{6}$/);
const roleSchema = z.enum(["WAITER", "CASHIER"]);

export async function createStaff(input: {
  username: string;
  fullName: string;
  role: "WAITER" | "CASHIER";
  pin: string;
}): Promise<ActionResult<{ id: string }>> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    const schema = z.object({
      username: usernameSchema,
      fullName: z.string().trim().min(2).max(80),
      role: roleSchema,
      pin: pinSchema,
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const exists = await prisma.profile.findUnique({
      where: { username: parsed.data.username },
    });
    if (exists) return fail(t("staff.usernameTaken"));

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: staffEmail(parsed.data.username),
      password: derivePassword(parsed.data.username, parsed.data.pin),
      email_confirm: true,
      app_metadata: { role: parsed.data.role },
    });

    if (error || !data.user) {
      return fail(t("error.generic"));
    }

    const userId = data.user.id;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.profile.create({
          data: {
            id: userId,
            username: parsed.data.username,
            fullName: parsed.data.fullName,
            role: parsed.data.role,
          },
        });
        await writeAudit(tx, {
          actorId: me.id,
          action: "STAFF_CREATED",
          entityType: "Profile",
          entityId: userId,
          after: { username: parsed.data.username, role: parsed.data.role },
        });
      });
    } catch {
      // لا تترك مستخدم Auth بدون profile
      await admin.auth.admin.deleteUser(userId);
      return fail(t("error.generic"));
    }

    revalidatePath("/owner/staff");
    return ok({ id: userId });
  });
}

export async function resetPin(input: {
  id: string;
  newPin: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    const schema = z.object({ id: z.string().uuid(), newPin: pinSchema });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const profile = await prisma.profile.findUnique({
      where: { id: parsed.data.id },
    });
    if (!profile || profile.role === "OWNER") return fail(t("error.noPermission"));

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(profile.id, {
      password: derivePassword(profile.username, parsed.data.newPin),
    });
    if (error) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      await writeAudit(tx, {
        actorId: me.id,
        action: "STAFF_PIN_RESET",
        entityType: "Profile",
        entityId: profile.id,
      });
    });

    revalidatePath("/owner/staff");
    return ok(undefined);
  });
}

export async function changeRole(input: {
  id: string;
  role: "WAITER" | "CASHIER";
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    const schema = z.object({ id: z.string().uuid(), role: roleSchema });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    if (parsed.data.id === me.id) return fail(t("staff.cannotChangeSelf"));

    const profile = await prisma.profile.findUnique({
      where: { id: parsed.data.id },
    });
    if (!profile || profile.role === "OWNER") return fail(t("error.noPermission"));

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(profile.id, {
      app_metadata: { role: parsed.data.role },
    });
    if (error) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profile.id },
        data: { role: parsed.data.role },
      });
      await writeAudit(tx, {
        actorId: me.id,
        action: "STAFF_ROLE_CHANGED",
        entityType: "Profile",
        entityId: profile.id,
        before: { role: profile.role },
        after: { role: parsed.data.role },
      });
    });

    revalidatePath("/owner/staff");
    return ok(undefined);
  });
}

export async function setStaffActive(input: {
  id: string;
  active: boolean;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    const schema = z.object({
      id: z.string().uuid(),
      active: z.boolean(),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    if (parsed.data.id === me.id && !parsed.data.active) {
      return fail(t("staff.cannotDisableSelf"));
    }

    const profile = await prisma.profile.findUnique({
      where: { id: parsed.data.id },
    });
    if (!profile || profile.role === "OWNER") return fail(t("error.noPermission"));

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(profile.id, {
      ban_duration: parsed.data.active ? "none" : "876000h",
    });
    if (error) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profile.id },
        data: { isActive: parsed.data.active },
      });
      await writeAudit(tx, {
        actorId: me.id,
        action: "STAFF_ACTIVE_CHANGED",
        entityType: "Profile",
        entityId: profile.id,
        after: { isActive: parsed.data.active },
      });
    });

    revalidatePath("/owner/staff");
    return ok(undefined);
  });
}
