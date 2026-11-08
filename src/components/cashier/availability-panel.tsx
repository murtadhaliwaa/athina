"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setItemAvailability } from "@/actions/menu";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

export type AvailabilityItem = {
  id: string;
  name: string;
  categoryName: string;
  isAvailable: boolean;
};

export function AvailabilityPanel({ items }: { items: AvailabilityItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [local, setLocal] = useState(items);
  const [itemsBaseline, setItemsBaseline] = useState(items);
  if (items !== itemsBaseline) {
    setItemsBaseline(items);
    setLocal(items);
  }

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return local;
    return local.filter(
      (i) => i.name.includes(q) || i.categoryName.includes(q),
    );
  }, [local, query]);

  const toggle = (id: string, next: boolean) => {
    setLocal((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isAvailable: next } : i)),
    );
    startTransition(async () => {
      const res = await setItemAvailability({ id, isAvailable: next });
      if (!res.ok) {
        toast.error(res.error);
        setLocal(items);
        return;
      }
      toast.success(next ? t("menu.available") : t("item.soldOut"));
      router.refresh();
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">{t("cashier.availability")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("cashier.availabilityHint")}
        </p>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("menu.search")}
        className="h-11 text-base"
      />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {t("cashier.availabilityEmpty")}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(item.id, !item.isAvailable)}
                className={cn(
                  "flex min-h-14 w-full items-center justify-between gap-3 px-3 py-3 text-start",
                  !item.isAvailable &&
                    "bg-destructive/15 ring-1 ring-inset ring-destructive/40",
                )}
              >
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">
                    {item.categoryName}
                  </p>
                  <p
                    className={cn(
                      "truncate font-medium",
                      !item.isAvailable && "text-destructive line-through",
                    )}
                  >
                    {item.name}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs font-medium",
                      item.isAvailable
                        ? "text-brand-gold"
                        : "text-destructive",
                    )}
                  >
                    {item.isAvailable
                      ? t("menu.available")
                      : t("item.soldOut")}
                  </p>
                </div>
                <Switch
                  checked={item.isAvailable}
                  disabled={pending}
                  tabIndex={-1}
                  className="pointer-events-none data-checked:bg-brand-amber"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
