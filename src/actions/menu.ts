"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCan, requireUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { ok, fail, type ActionResult } from "@/lib/errors";
import { handleAction, iqdSchema } from "@/actions/helpers";
import { t } from "@/lib/i18n/ar-iq";

const nameSchema = z.string().trim().min(1).max(80);

export async function createCategory(input: {
  name: string;
}): Promise<ActionResult<{ id: string }>> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const name = nameSchema.safeParse(input.name);
    if (!name.success) return fail(t("error.generic"));

    const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: {
        name: name.data,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });

    updateTag("menu");
    revalidatePath("/owner/menu");
    return ok({ id: category.id });
  });
}

export async function updateCategory(input: {
  id: string;
  name: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const schema = z.object({ id: z.string().uuid(), name: nameSchema });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    await prisma.category.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name },
    });

    updateTag("menu");
    revalidatePath("/owner/menu");
    return ok(undefined);
  });
}

export async function reorderCategories(input: {
  orderedIds: string[];
}): Promise<ActionResult> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const ids = z.array(z.string().uuid()).safeParse(input.orderedIds);
    if (!ids.success) return fail(t("error.generic"));

    await prisma.$transaction(
      ids.data.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    updateTag("menu");
    revalidatePath("/owner/menu");
    return ok(undefined);
  });
}

export async function toggleCategory(input: { id: string }): Promise<ActionResult> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const id = z.string().uuid().safeParse(input.id);
    if (!id.success) return fail(t("error.generic"));

    const cat = await prisma.category.findUnique({ where: { id: id.data } });
    if (!cat) return fail(t("error.notFound"));

    await prisma.category.update({
      where: { id: cat.id },
      data: { isActive: !cat.isActive },
    });

    updateTag("menu");
    revalidatePath("/owner/menu");
    return ok(undefined);
  });
}

export async function createMenuItem(input: {
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  isAvailable?: boolean;
  isActive?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const schema = z.object({
      categoryId: z.string().uuid(),
      name: nameSchema,
      description: z.string().trim().max(200).optional().nullable(),
      price: iqdSchema,
      isAvailable: z.boolean().optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const max = await prisma.menuItem.aggregate({
      where: { categoryId: parsed.data.categoryId },
      _max: { sortOrder: true },
    });

    const item = await prisma.menuItem.create({
      data: {
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        price: parsed.data.price,
        isAvailable: parsed.data.isAvailable ?? true,
        isActive: parsed.data.isActive ?? true,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });

    updateTag("menu");
    revalidatePath("/owner/menu");
    return ok({ id: item.id });
  });
}

export async function updateMenuItem(input: {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  isAvailable?: boolean;
  isActive?: boolean;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    const schema = z.object({
      id: z.string().uuid(),
      categoryId: z.string().uuid(),
      name: nameSchema,
      description: z.string().trim().max(200).optional().nullable(),
      price: iqdSchema,
      isAvailable: z.boolean().optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const before = await prisma.menuItem.findUnique({
      where: { id: parsed.data.id },
    });
    if (!before) return fail(t("error.notFound"));

    await prisma.$transaction(async (tx) => {
      await tx.menuItem.update({
        where: { id: parsed.data.id },
        data: {
          categoryId: parsed.data.categoryId,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          price: parsed.data.price,
          ...(parsed.data.isAvailable !== undefined
            ? { isAvailable: parsed.data.isAvailable }
            : {}),
          ...(parsed.data.isActive !== undefined
            ? { isActive: parsed.data.isActive }
            : {}),
        },
      });

      if (before.price !== parsed.data.price) {
        await writeAudit(tx, {
          actorId: me.id,
          action: "MENU_PRICE_CHANGED",
          entityType: "MenuItem",
          entityId: parsed.data.id,
          before: { price: before.price },
          after: { price: parsed.data.price },
        });
      }

      if (
        parsed.data.isAvailable !== undefined &&
        before.isAvailable !== parsed.data.isAvailable
      ) {
        await writeAudit(tx, {
          actorId: me.id,
          action: "MENU_ITEM_AVAILABILITY",
          entityType: "MenuItem",
          entityId: parsed.data.id,
          after: { isAvailable: parsed.data.isAvailable },
        });
      }
    });

    updateTag("menu");
    revalidatePath("/owner/menu");
    return ok(undefined);
  });
}

export async function setItemAvailability(input: {
  id: string;
  isAvailable: boolean;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER", "CASHIER"]);
    assertCan(me.role, "menu.toggle_availability");
    const schema = z.object({
      id: z.string().uuid(),
      isAvailable: z.boolean(),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      await tx.menuItem.update({
        where: { id: parsed.data.id },
        data: { isAvailable: parsed.data.isAvailable },
      });
      await writeAudit(tx, {
        actorId: me.id,
        action: "MENU_ITEM_AVAILABILITY",
        entityType: "MenuItem",
        entityId: parsed.data.id,
        after: { isAvailable: parsed.data.isAvailable },
      });
    });

    updateTag("menu");
    revalidatePath("/owner/menu");
    revalidatePath("/cashier/shift");
    revalidatePath("/waiter");
    revalidatePath("/waiter/new");
    return ok(undefined);
  });
}

export async function toggleMenuItemActive(input: {
  id: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const id = z.string().uuid().safeParse(input.id);
    if (!id.success) return fail(t("error.generic"));

    const item = await prisma.menuItem.findUnique({ where: { id: id.data } });
    if (!item) return fail(t("error.notFound"));

    await prisma.menuItem.update({
      where: { id: item.id },
      data: { isActive: !item.isActive },
    });

    updateTag("menu");
    revalidatePath("/owner/menu");
    return ok(undefined);
  });
}

export async function reorderItems(input: {
  categoryId: string;
  orderedIds: string[];
}): Promise<ActionResult> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const schema = z.object({
      categoryId: z.string().uuid(),
      orderedIds: z.array(z.string().uuid()),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const owned = await prisma.menuItem.count({
      where: {
        categoryId: parsed.data.categoryId,
        id: { in: parsed.data.orderedIds },
      },
    });
    if (owned !== parsed.data.orderedIds.length) {
      return fail(t("error.generic"));
    }

    await prisma.$transaction(
      parsed.data.orderedIds.map((id, index) =>
        prisma.menuItem.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    updateTag("menu");
    revalidatePath("/owner/menu");
    revalidatePath("/waiter");
    return ok(undefined);
  });
}

const MAX_IMAGE_BYTES = 500 * 1024;

export async function uploadMenuImage(input: {
  menuItemId: string;
  formData: FormData;
}): Promise<ActionResult> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const menuItemId = z.string().uuid().safeParse(input.menuItemId);
    if (!menuItemId.success) return fail(t("error.generic"));

    const file = input.formData.get("file");
    if (!(file instanceof File)) return fail(t("menu.imageRequired"));

    if (file.size > MAX_IMAGE_BYTES) return fail(t("menu.imageTooLarge"));

    const allowed = ["image/webp", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) return fail(t("menu.imageType"));

    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId.data },
    });
    if (!item) return fail(t("error.notFound"));

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/jpeg"
          ? "jpg"
          : "webp";
    const path = `${item.id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const admin = createAdminClient();
    const { error } = await admin.storage.from("menu-images").upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (error) return fail(t("error.generic"));

    if (item.imagePath && item.imagePath !== path) {
      await admin.storage.from("menu-images").remove([item.imagePath]);
    }

    await prisma.menuItem.update({
      where: { id: item.id },
      data: { imagePath: path },
    });

    updateTag("menu");
    revalidatePath("/owner/menu");
    revalidatePath("/waiter");
    revalidatePath("/waiter/new");
    return ok(undefined);
  });
}
