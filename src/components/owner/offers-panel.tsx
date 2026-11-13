"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createOffer,
  updateOffer,
  toggleOfferActive,
  type OfferListItem,
} from "@/actions/offers";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatOfferWindowLabel,
  minuteToTimeInput,
} from "@/lib/offers/window";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

function parseComponents(raw: string) {
  return raw
    .split(/\n|,|،/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function OffersPanel({ offers }: { offers: OfferListItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [componentsText, setComponentsText] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("18:00");

  const sorted = useMemo(
    () =>
      [...offers].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name, "ar");
      }),
    [offers],
  );

  function resetForm() {
    setEditingId(null);
    setFormOpen(false);
    setName("");
    setPrice("");
    setComponentsText("");
    setStartTime("12:00");
    setEndTime("18:00");
  }

  function openCreate() {
    setEditingId(null);
    setName("");
    setPrice("");
    setComponentsText("");
    setStartTime("12:00");
    setEndTime("18:00");
    setFormOpen(true);
  }

  function startEdit(offer: OfferListItem) {
    setEditingId(offer.id);
    setName(offer.name);
    setPrice(String(offer.price));
    setComponentsText(offer.components.join("\n"));
    setStartTime(minuteToTimeInput(offer.startMinute));
    setEndTime(minuteToTimeInput(offer.endMinute));
    setFormOpen(true);
  }

  function onSave() {
    const parsedPrice = parseInt(price, 10);
    const components = parseComponents(componentsText);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 1) {
      toast.error(t("offer.priceRequired"));
      return;
    }
    if (name.trim().length < 2) {
      toast.error(t("error.generic"));
      return;
    }
    if (components.length < 1) {
      toast.error(t("offer.componentsRequired"));
      return;
    }

    const payload = {
      name: name.trim(),
      price: parsedPrice,
      startTime,
      endTime,
      components,
    };

    startTransition(async () => {
      const res = editingId
        ? await updateOffer({ ...payload, offerId: editingId })
        : await createOffer(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(editingId ? t("offer.updated") : t("offer.saved"));
      resetForm();
      router.refresh();
    });
  }

  function onToggle(offerId: string) {
    startTransition(async () => {
      const res = await toggleOfferActive({ offerId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-4 pt-2 pb-28">
      <PageHeader title={t("offer.title")} subtitle={t("offer.subtitle")} />

      {formOpen ? (
        <section className="space-y-4 rounded-[20px] bg-card p-5 shadow-sm dark:bg-[#1c1c1e]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold tracking-tight">
              {editingId ? t("offer.edit") : t("offer.add")}
            </h2>
            <button
              type="button"
              disabled={pending}
              onClick={resetForm}
              className="text-[15px] font-medium text-brand-gold disabled:opacity-60"
            >
              {editingId ? t("offer.cancelEdit") : t("offer.closeForm")}
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offer-name">{t("offer.name")}</Label>
            <Input
              id="offer-name"
              className="h-12 rounded-xl border-0 bg-foreground/[0.06] text-[17px] dark:bg-white/[0.08]"
              placeholder={t("offer.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offer-price">{t("offer.price")}</Label>
            <div className="relative">
              <Input
                id="offer-price"
                type="text"
                inputMode="numeric"
                dir="ltr"
                className="h-12 rounded-xl border-0 bg-foreground/[0.06] pe-3 ps-12 text-end text-[17px] tabular-nums dark:bg-white/[0.08]"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value.replace(/[^\d]/g, ""))
                }
                disabled={pending}
              />
              <span className="text-muted-foreground pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs">
                د.ع
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="offer-start">{t("offer.startTime")}</Label>
              <Input
                id="offer-start"
                type="time"
                dir="ltr"
                className="h-12 rounded-xl border-0 bg-foreground/[0.06] text-[15px] dark:bg-white/[0.08]"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-end">{t("offer.endTime")}</Label>
              <Input
                id="offer-end"
                type="time"
                dir="ltr"
                className="h-12 rounded-xl border-0 bg-foreground/[0.06] text-[15px] dark:bg-white/[0.08]"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offer-components">{t("offer.components")}</Label>
            <Textarea
              id="offer-components"
              className="min-h-28 rounded-xl border-0 bg-foreground/[0.06] text-[16px] dark:bg-white/[0.08]"
              placeholder={t("offer.componentsPlaceholder")}
              value={componentsText}
              onChange={(e) => setComponentsText(e.target.value)}
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              {t("offer.componentsHint")}
            </p>
          </div>

          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-brand-amber text-[17px] font-semibold text-black hover:bg-brand-amber/90"
            disabled={pending}
            onClick={onSave}
          >
            {pending
              ? t("app.loading")
              : editingId
                ? t("offer.update")
                : t("offer.save")}
          </Button>
        </section>
      ) : null}

      {sorted.length === 0 ? (
        <p className="text-muted-foreground px-2 py-16 text-center text-[15px]">
          {t("offer.empty")}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-[14px] bg-card dark:bg-[#1c1c1e]">
          {sorted.map((offer, idx) => (
            <li key={offer.id}>
              {idx > 0 ? (
                <div
                  className="bg-border/80 ms-4 h-px dark:bg-white/[0.08]"
                  aria-hidden
                />
              ) : null}
              <div className="flex flex-col gap-2 px-4 py-3.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startEdit(offer)}
                  className="flex w-full items-start gap-3 text-start"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-medium leading-snug">
                      {offer.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[13px]">
                      {offer.components.join(" · ")}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[13px]">
                      {t("offer.window")}:{" "}
                      {formatOfferWindowLabel(
                        offer.startMinute,
                        offer.endMinute,
                      )}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[12px] font-medium",
                        offer.windowOpenNow
                          ? "text-emerald-500"
                          : "text-muted-foreground",
                      )}
                    >
                      {!offer.isActive
                        ? t("offer.toggleOff")
                        : offer.windowOpenNow
                          ? t("offer.activeNow")
                          : t("offer.inactiveWindow")}
                    </p>
                  </div>
                  <p className="shrink-0 text-[16px] font-semibold tabular-nums">
                    <MoneyBdi amount={offer.price} />
                  </p>
                </button>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onToggle(offer.id)}
                    className={cn(
                      "h-9 rounded-full px-4 text-[13px] font-semibold",
                      offer.isActive
                        ? "bg-foreground/[0.06] text-muted-foreground dark:bg-white/[0.08]"
                        : "bg-brand-amber text-black",
                    )}
                  >
                    {offer.isActive
                      ? t("offer.toggleOff")
                      : t("offer.toggleOn")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!formOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
          <Button
            type="button"
            className="pointer-events-auto h-12 rounded-full bg-brand-amber px-8 text-[16px] font-semibold text-black shadow-[0_8px_28px_rgba(0,0,0,0.35)] hover:bg-brand-amber/90"
            onClick={openCreate}
          >
            {t("offer.add")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
