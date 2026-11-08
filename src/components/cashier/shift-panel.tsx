"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { closeShift, openShift } from "@/actions/shifts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatBaghdadDateTime } from "@/lib/format-datetime";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { t } from "@/lib/i18n/ar-iq";

type ShiftView = {
  id: string;
  openedAt: string;
  openingCash: number;
} | null;

export function ShiftPanel({ shift }: { shift: ShiftView }) {
  const [pending, startTransition] = useTransition();
  const [openingCash, setOpeningCash] = useState(0);
  const [counted, setCounted] = useState(0);
  const [note, setNote] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else toast.success(shift ? t("shift.closedOk") : t("shift.open"));
    });
  };

  if (!shift) {
    return (
      <div className="space-y-4 p-4">
        <section className="overflow-hidden rounded-2xl border border-brand-gold/35 bg-card shadow-sm">
          <div className="h-1 bg-brand-gold" aria-hidden />
          <div className="space-y-4 p-4">
            <div>
              <p className="text-muted-foreground text-sm">
                {t("shift.notOpen")}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("shift.openHint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-opening-cash">{t("shift.openingCash")}</Label>
              <Input
                id="shift-opening-cash"
                type="number"
                inputMode="numeric"
                className="h-11 text-base"
                value={openingCash || ""}
                placeholder={t("shift.openingCashPlaceholder")}
                onChange={(e) =>
                  setOpeningCash(parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
            <Button
              className="h-11 w-full bg-brand-amber text-base font-semibold text-black hover:bg-brand-amber/90"
              disabled={pending}
              onClick={() => run(() => openShift({ openingCash }))}
            >
              {pending ? t("app.loading") : t("shift.open")}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-24">
      <section className="overflow-hidden rounded-2xl border border-brand-gold/35 bg-card shadow-sm">
        <div className="h-1 bg-brand-gold" aria-hidden />
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs">
                {t("shift.openSince")}
              </p>
              <p className="text-sm font-medium">
                {formatBaghdadDateTime(new Date(shift.openedAt))}
              </p>
            </div>
            <div className="text-end">
              <p className="text-muted-foreground text-xs">
                {t("shift.openingCash")}
              </p>
              <p className="text-xl font-semibold">
                <MoneyBdi amount={shift.openingCash} />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-muted-foreground text-sm">{t("shift.closeHint")}</p>
        <div className="space-y-2">
          <Label htmlFor="shift-counted">{t("shift.counted")}</Label>
          <Input
            id="shift-counted"
            type="number"
            inputMode="numeric"
            className="h-11 text-base"
            value={counted || ""}
            placeholder={t("shift.countedPlaceholder")}
            onChange={(e) => setCounted(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shift-note">{t("shift.note")}</Label>
          <Textarea
            id="shift-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("shift.notePlaceholder")}
            className="text-base"
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="destructive"
                className="h-11 w-full"
                disabled={pending}
              >
                {pending ? t("app.loading") : t("shift.close")}
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("shift.close")}</AlertDialogTitle>
            </AlertDialogHeader>
            <p className="text-muted-foreground text-sm">
              {t("confirm.areYouSure")}
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("confirm.no")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                onClick={() =>
                  run(() => closeShift({ countedCash: counted, note }))
                }
              >
                {pending ? t("app.loading") : t("confirm.yes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
