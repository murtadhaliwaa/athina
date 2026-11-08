"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateSettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/i18n/ar-iq";

type Settings = {
  cafeName: string;
  phone: string | null;
  address: string | null;
  receiptFooter: string | null;
  businessDayStartHour: number;
};

const fieldClass =
  "h-12 rounded-2xl border-0 bg-card text-base text-foreground placeholder:text-muted-foreground ring-1 ring-border focus-visible:ring-brand-amber/40";
const areaClass =
  "min-h-24 rounded-2xl border-0 bg-card text-base text-foreground placeholder:text-muted-foreground ring-1 ring-border focus-visible:ring-brand-amber/40";
const labelClass = "text-xs font-medium text-muted-foreground";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await updateSettings({
            cafeName: String(fd.get("cafeName")),
            phone: String(fd.get("phone") || "") || null,
            address: String(fd.get("address") || "") || null,
            receiptFooter: String(fd.get("receiptFooter") || "") || null,
            businessDayStartHour: parseInt(
              String(fd.get("businessDayStartHour")),
              10,
            ),
          });
          if (!res.ok) toast.error(res.error);
          else toast.success(t("app.save"));
        });
      }}
    >
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>{t("settings.cafeName")}</Label>
          <Input
            name="cafeName"
            defaultValue={settings.cafeName}
            placeholder={t("settings.cafeNamePlaceholder")}
            className={fieldClass}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>{t("settings.phone")}</Label>
          <Input
            name="phone"
            defaultValue={settings.phone ?? ""}
            placeholder={t("settings.phonePlaceholder")}
            className={fieldClass}
            dir="ltr"
            inputMode="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>{t("settings.address")}</Label>
          <Textarea
            name="address"
            defaultValue={settings.address ?? ""}
            placeholder={t("settings.addressPlaceholder")}
            className={areaClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>{t("settings.receiptFooter")}</Label>
          <Textarea
            name="receiptFooter"
            defaultValue={settings.receiptFooter ?? ""}
            placeholder={t("settings.receiptFooterPlaceholder")}
            className={areaClass}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label className={labelClass}>{t("settings.businessDayStart")}</Label>
          <Input
            name="businessDayStartHour"
            type="number"
            min={0}
            max={12}
            defaultValue={settings.businessDayStartHour}
            placeholder={t("settings.businessDayStartPlaceholder")}
            className={`${fieldClass} w-28`}
            dir="ltr"
          />
        </div>
      </section>

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-2xl bg-brand-amber text-base font-semibold text-black hover:bg-brand-amber/90"
      >
        {pending ? t("app.loading") : t("app.save")}
      </Button>
    </form>
  );
}
