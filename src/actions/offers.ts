"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCan, requireUser } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import {
  componentsDescription,
  ensureOffersCategory,
} from "@/lib/offers/ensure-category";
import { isOfferWindowOpen, parseTimeToMinute } from "@/lib/offers/window";
import { AppError, ok, fail, type ActionResult } from "@/lib/errors";
import { handleAction, iqdSchema } from "@/actions/helpers";
import { t } from "@/lib/i18n/ar-iq";

const TX = { maxWait: 10_000, timeout: 20_000 } as const;

const componentSchema = z.string().trim().min(1).max(60);

const offerBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  price: iqdSchema.refine((n) => n >= 1, t("offer.priceRequired")),
  startTime: z.string().trim(),
  endTime: z.string().trim(),
  components: z.array(componentSchema).min(1).max(12),
});

function parseWindow(startTime: string, endTime: string) {
  const startMinute = parseTimeToMinute(startTime);
  const endMinute = parseTimeToMinute(endTime);
  if (startMinute == null || endMinute == null) {
    return { ok: false as const, error: t("offer.timeInvalid") };
  }
  if (startMinute >= endMinute) {
    return { ok: false as const, error: t("offer.timeOrder") };
  }
  return { ok: true as const, startMinute, endMinute };
}

export type OfferListItem = {
  id: string;
  name: string;
  price: number;
  startMinute: number;
  endMinute: number;
  isActive: boolean;
  menuItemId: string;
  components: string[];
  windowOpenNow: boolean;
};

export async function listOffersForOwner(): Promise<OfferListItem[]> {
  const me = await requireUser(["OWNER"]);
  assertCan(me.role, "offers.manage");

  const rows = await prisma.offer.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: {
      components: { orderBy: { sortOrder: "asc" }, select: { label: true } },
    },
  });

  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    startMinute: r.startMinute,
    endMinute: r.endMinute,
    isActive: r.isActive,
    menuItemId: r.menuItemId,
    components: r.components.map((c) => c.label),
    windowOpenNow:
      r.isActive && isOfferWindowOpen(r.startMinute, r.endMinute, now),
  }));
}

export async function createOffer(
  input: z.infer<typeof offerBodySchema>,
): Promise<ActionResult<{ id: string }>> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    assertCan(me.role, "offers.manage");
    const parsed = offerBodySchema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const window = parseWindow(parsed.data.startTime, parsed.data.endTime);
    if (!window.ok) return fail(window.error);

    const labels = parsed.data.components.map((c) => c.trim()).filter(Boolean);
    if (labels.length < 1) return fail(t("offer.componentsRequired"));
    const description = componentsDescription(labels);

    const created = await prisma.$transaction(async (tx) => {
      const categoryId = await ensureOffersCategory(tx);
      const maxItem = await tx.menuItem.aggregate({
        where: { categoryId },
        _max: { sortOrder: true },
      });

      const menuItem = await tx.menuItem.create({
        data: {
          categoryId,
          name: parsed.data.name,
          description,
          price: parsed.data.price,
          isActive: true,
          isAvailable: true,
          sortOrder: (maxItem._max.sortOrder ?? 0) + 1,
        },
        select: { id: true },
      });

      const offer = await tx.offer.create({
        data: {
          name: parsed.data.name,
          price: parsed.data.price,
          startMinute: window.startMinute,
          endMinute: window.endMinute,
          isActive: true,
          menuItemId: menuItem.id,
          components: {
            create: labels.map((label, i) => ({
              label,
              sortOrder: i + 1,
            })),
          },
        },
        select: { id: true },
      });

      await writeAudit(tx, {
        actorId: me.id,
        action: "OFFER_CREATED",
        entityType: "Offer",
        entityId: offer.id,
        after: {
          name: parsed.data.name,
          price: parsed.data.price,
          startMinute: window.startMinute,
          endMinute: window.endMinute,
          components: labels,
        },
      });

      return offer;
    }, TX);

    updateTag("menu");
    revalidatePath("/owner/offers");
    revalidatePath("/waiter/new");
    return ok({ id: created.id });
  });
}

const updateOfferSchema = offerBodySchema.extend({
  offerId: z.string().uuid(),
});

export async function updateOffer(
  input: z.infer<typeof updateOfferSchema>,
): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    assertCan(me.role, "offers.manage");
    const parsed = updateOfferSchema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const window = parseWindow(parsed.data.startTime, parsed.data.endTime);
    if (!window.ok) return fail(window.error);

    const labels = parsed.data.components.map((c) => c.trim()).filter(Boolean);
    if (labels.length < 1) return fail(t("offer.componentsRequired"));
    const description = componentsDescription(labels);

    await prisma.$transaction(async (tx) => {
      const before = await tx.offer.findUnique({
        where: { id: parsed.data.offerId },
        include: {
          components: { select: { label: true } },
        },
      });
      if (!before) throw new AppError("NOT_FOUND", t("error.notFound"));

      await tx.offer.update({
        where: { id: before.id },
        data: {
          name: parsed.data.name,
          price: parsed.data.price,
          startMinute: window.startMinute,
          endMinute: window.endMinute,
        },
      });

      await tx.offerComponent.deleteMany({ where: { offerId: before.id } });
      await tx.offerComponent.createMany({
        data: labels.map((label, i) => ({
          offerId: before.id,
          label,
          sortOrder: i + 1,
        })),
      });

      await tx.menuItem.update({
        where: { id: before.menuItemId },
        data: {
          name: parsed.data.name,
          price: parsed.data.price,
          description,
        },
      });

      await writeAudit(tx, {
        actorId: me.id,
        action: "OFFER_UPDATED",
        entityType: "Offer",
        entityId: before.id,
        before: {
          name: before.name,
          price: before.price,
          startMinute: before.startMinute,
          endMinute: before.endMinute,
          components: before.components.map((c) => c.label),
        },
        after: {
          name: parsed.data.name,
          price: parsed.data.price,
          startMinute: window.startMinute,
          endMinute: window.endMinute,
          components: labels,
        },
      });
    }, TX);

    updateTag("menu");
    revalidatePath("/owner/offers");
    revalidatePath("/waiter/new");
    return ok(undefined);
  });
}

export async function toggleOfferActive(input: {
  offerId: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    assertCan(me.role, "offers.manage");
    const id = z.string().uuid().safeParse(input.offerId);
    if (!id.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      const row = await tx.offer.findUnique({ where: { id: id.data } });
      if (!row) throw new AppError("NOT_FOUND", t("error.notFound"));

      const next = !row.isActive;
      await tx.offer.update({
        where: { id: row.id },
        data: { isActive: next },
      });
      await tx.menuItem.update({
        where: { id: row.menuItemId },
        data: { isActive: next },
      });

      await writeAudit(tx, {
        actorId: me.id,
        action: "OFFER_TOGGLED",
        entityType: "Offer",
        entityId: row.id,
        before: { isActive: row.isActive },
        after: { isActive: next },
      });
    }, TX);

    updateTag("menu");
    revalidatePath("/owner/offers");
    revalidatePath("/waiter/new");
    return ok(undefined);
  });
}
