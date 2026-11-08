"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { addItemsToOrder } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { MenuItemCard } from "@/components/shared/menu-item-card";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { PageHeader } from "@/components/shared/page-header";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

const SUGAR_NOTE_SHORTCUTS = [
  "order.noteNoSugar",
  "order.noteExtraSugar",
] as const;

const TEMP_NOTE_SHORTCUTS = [
  "order.noteHot",
  "order.noteCold",
] as const;

/** مطابقة مرنة لأسماء التصنيفات (حتى لو غيّر المالك الاسم قليلاً) */
function categoryHas(name: string, needles: string[]) {
  const n = name.trim();
  return needles.some((needle) => n.includes(needle));
}

function noteShortcutsForCategory(categoryName: string) {
  const keys: (
    | (typeof SUGAR_NOTE_SHORTCUTS)[number]
    | (typeof TEMP_NOTE_SHORTCUTS)[number]
  )[] = [];
  // سكر: مشروبات تُحضَّر (مو غازية جاهزة ولا ماء)
  if (
    categoryHas(categoryName, ["قهوة", "شاي", "عصير", "موهيتو", "كوكتيل"])
  ) {
    keys.push(...SUGAR_NOTE_SHORTCUTS);
  }
  // سخن/بارد: قهوة وشاي فقط
  if (categoryHas(categoryName, ["قهوة", "شاي"])) {
    keys.push(...TEMP_NOTE_SHORTCUTS);
  }
  return keys;
}

type MenuCategory = {
  id: string;
  name: string;
  items: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    imagePath: string | null;
    updatedAt?: string | Date | null;
    isAvailable: boolean;
  }[];
};

type CartLine = {
  menuItemId: string;
  name: string;
  categoryName: string;
  price: number;
  quantity: number;
  note: string;
};

export function OrderBuilder({
  categories,
  tableId,
  tableLabel,
  redirectTo,
  shiftOpen = true,
}: {
  categories: MenuCategory[];
  tableId: string;
  tableLabel?: string;
  redirectTo: string;
  shiftOpen?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [activeCatId, setActiveCatId] = useState(categories[0]?.id ?? "");

  const refreshMenu = useCallback(() => router.refresh(), [router]);
  useRealtimeRefresh(["menu_items"], refreshMenu, {
    debounceMs: 600,
    backupMs: 120_000,
  });

  const lines = useMemo(() => Object.values(cart), [cart]);
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const activeCategory =
    categories.find((c) => c.id === activeCatId) ?? categories[0];
  const visibleItems = useMemo(() => {
    const items = activeCategory?.items ?? [];
    return [...items].sort((a, b) => {
      if (a.isAvailable === b.isAvailable) return 0;
      return a.isAvailable ? -1 : 1;
    });
  }, [activeCategory]);

  const appendNote = (
    lineId: string,
    shortcutKey:
      | (typeof SUGAR_NOTE_SHORTCUTS)[number]
      | (typeof TEMP_NOTE_SHORTCUTS)[number],
  ) => {
    const label = t(shortcutKey);
    setCart((prev) => {
      const cur = prev[lineId];
      if (!cur) return prev;
      const next = cur.note.includes(label)
        ? cur.note
        : [cur.note, label].filter(Boolean).join(" · ").slice(0, 140);
      return { ...prev, [lineId]: { ...cur, note: next } };
    });
  };

  const addOne = (
    item: MenuCategory["items"][number],
    categoryName: string,
  ) => {
    if (!shiftOpen) {
      toast.error(t("shift.closed"));
      return;
    }
    if (!item.isAvailable) return;
    setCart((prev) => {
      const cur = prev[item.id];
      const qty = Math.min(99, (cur?.quantity ?? 0) + 1);
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          name: item.name,
          categoryName,
          price: item.price,
          quantity: qty,
          note: cur?.note ?? "",
        },
      };
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const qty = cur.quantity + delta;
      if (qty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...cur, quantity: Math.min(99, qty) } };
    });
  };

  const submit = () => {
    if (lines.length === 0) {
      toast.error(t("order.empty"));
      return;
    }
    startTransition(async () => {
      // يضيف لطلب NEW إن وُجد، وإلا ينشئ طلباً جديداً
      const res = await addItemsToOrder({
        tableId,
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          note: l.note || null,
        })),
        note: orderNote.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("order.sent"));
      router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader
        title={t("order.new")}
        subtitle={
          tableLabel
            ? t("tables.withLabel", { label: tableLabel })
            : t("tables.title")
        }
      />

      {categories.length === 0 ? (
        <p className="text-muted-foreground p-6">{t("empty.generic")}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-3 pt-2 pb-1">
            <div className="flex gap-1 overflow-x-auto overscroll-x-contain rounded-2xl bg-foreground/[0.06] p-1 touch-pan-x [scrollbar-width:none] dark:bg-white/[0.07] [&::-webkit-scrollbar]:hidden">
              {categories.map((c) => {
                const selected = c.id === activeCategory?.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActiveCatId(c.id)}
                    className={cn(
                      "inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold whitespace-nowrap",
                      selected
                        ? "bg-brand-amber text-black shadow-sm"
                        : "text-foreground/80 hover:bg-background/80 hover:text-foreground dark:hover:bg-white/10",
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleItems.map((item, index) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  categoryName={activeCategory?.name ?? ""}
                  quantity={cart[item.id]?.quantity ?? 0}
                  onAdd={() => addOne(item, activeCategory?.name ?? "")}
                  priority={index < 4}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* فوق شريط التنقل السفلي (min-h-16) + منطقة الأمان */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t bg-background p-3">
        {!shiftOpen ? (
          <p className="bg-destructive/10 text-destructive mb-2 rounded-xl px-3 py-2 text-center text-sm">
            {t("shift.closed")}
          </p>
        ) : null}
        <Drawer
          open={cartOpen}
          onOpenChange={(open) => {
            if (!shiftOpen && open) {
              toast.error(t("shift.closed"));
              return;
            }
            setCartOpen(open);
          }}
        >
          <DrawerTrigger
            render={
              <Button
                className="h-12 w-full bg-brand-amber text-base font-semibold text-black hover:bg-brand-amber/90"
                disabled={!shiftOpen || (count === 0 && !cartOpen)}
              >
                {t("order.cart")} (<bdi dir="ltr">{count}</bdi>) ·{" "}
                <MoneyBdi amount={total} />
              </Button>
            }
          />
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>{t("order.cart")}</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-4 overflow-y-auto px-4 pb-2">
              {lines.length === 0 ? (
                <p className="text-muted-foreground">{t("order.empty")}</p>
              ) : (
                lines.map((line) => {
                  const shortcuts = noteShortcutsForCategory(line.categoryName);
                  return (
                  <div key={line.menuItemId} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-medium">{line.name}</span>
                        {line.categoryName ? (
                          <p className="text-muted-foreground text-xs">
                            {line.categoryName}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11"
                          onClick={() => changeQty(line.menuItemId, -1)}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <bdi dir="ltr" className="min-w-6 text-center">
                          {line.quantity}
                        </bdi>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11"
                          onClick={() => changeQty(line.menuItemId, 1)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>
                    {shortcuts.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {shortcuts.map((key) => (
                          <button
                            key={key}
                            type="button"
                            className="bg-muted inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium"
                            onClick={() => appendNote(line.menuItemId, key)}
                          >
                            {t(key)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <Textarea
                      className="mt-2 min-h-10 text-base"
                      placeholder={t(
                        shortcuts.length > 0
                          ? "order.notePlaceholder"
                          : "order.notePlaceholderOther",
                      )}
                      value={line.note}
                      onChange={(e) =>
                        setCart((prev) => ({
                          ...prev,
                          [line.menuItemId]: {
                            ...line,
                            note: e.target.value.slice(0, 140),
                          },
                        }))
                      }
                    />
                  </div>
                  );
                })
              )}
              <div>
                <p className="mb-1 text-sm">{t("order.noteWholeOrder")}</p>
                <Textarea
                  className="text-base"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value.slice(0, 140))}
                  placeholder={t("order.notePlaceholderOther")}
                />
              </div>
            </div>
            <DrawerFooter>
              <Button
                className="h-12 bg-brand-amber text-base font-semibold text-black hover:bg-brand-amber/90"
                disabled={!shiftOpen || pending || lines.length === 0}
                onClick={submit}
              >
                {pending ? t("app.loading") : t("order.send")}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
