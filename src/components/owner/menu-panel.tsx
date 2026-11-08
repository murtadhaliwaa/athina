"use client";

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera,
  ChevronDown,
  Coffee,
  CupSoda,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import {
  createCategory,
  createMenuItem,
  reorderCategories,
  reorderItems,
  setItemAvailability,
  toggleCategory,
  updateCategory,
  updateMenuItem,
  uploadMenuImage,
} from "@/actions/menu";
import {
  PageHeader,
  PageHeaderActions,
} from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { menuImagePublicUrl } from "@/lib/menu/image-url";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

type Item = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  isAvailable: boolean;
  isActive: boolean;
  imagePath: string | null;
  categoryId: string;
};

type Cat = {
  id: string;
  name: string;
  isActive: boolean;
  items: Omit<Item, "categoryId">[];
};

type FormState = {
  id?: string;
  name: string;
  description: string;
  price: string;
  categoryId: string;
  isAvailable: boolean;
  isActive: boolean;
  imagePath: string | null;
  imageFile: File | null;
  imagePreview: string | null;
};

function emptyForm(categoryId: string): FormState {
  return {
    name: "",
    description: "",
    price: "",
    categoryId,
    isAvailable: true,
    isActive: true,
    imagePath: null,
    imageFile: null,
    imagePreview: null,
  };
}

function ItemThumb({
  name,
  imagePath,
}: {
  name: string;
  imagePath: string | null;
}) {
  const url = menuImagePublicUrl(imagePath);
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={48}
        height={48}
        className="size-12 rounded-xl object-cover"
      />
    );
  }
  const Icon = /عصير|شاي|ماء|مشروب/i.test(name) ? CupSoda : Coffee;
  return (
    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-card text-muted-foreground">
      <Icon className="size-5" />
    </span>
  );
}

export function MenuPanel({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(categories[0]?.id ?? ""),
  );
  const [newCatName, setNewCatName] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const itemCount = categories.reduce((n, c) => n + c.items.length, 0);

  const flatItems: Item[] = useMemo(
    () =>
      categories.flatMap((c) =>
        c.items.map((i) => ({ ...i, categoryId: c.id })),
      ),
    [categories],
  );

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flatItems.filter((item) => {
      if (catFilter !== "all" && item.categoryId !== catFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [flatItems, catFilter, query]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(t("app.save"));
        router.refresh();
      }
    });
  };

  const openCreate = () => {
    if (categories.length === 0) {
      toast.error(t("menu.noCategories"));
      setCatsOpen(true);
      return;
    }
    const preferred =
      catFilter !== "all" ? catFilter : (categories[0]?.id ?? "");
    setForm(emptyForm(preferred));
    setFormOpen(true);
  };

  const openEdit = (item: Item) => {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      categoryId: item.categoryId,
      isAvailable: item.isAvailable,
      isActive: item.isActive,
      imagePath: item.imagePath,
      imageFile: null,
      imagePreview: null,
    });
    setFormOpen(true);
  };

  const compressAndKeep = async (file: File) => {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: 800,
      maxSizeMB: 0.2,
      fileType: "image/webp",
    });
    const preview = URL.createObjectURL(compressed);
    setForm((f) => ({
      ...f,
      imageFile: compressed,
      imagePreview: preview,
    }));
  };

  const saveForm = () => {
    const name = form.name.trim();
    const price = parseInt(form.price.replace(/,/g, ""), 10);
    if (!name || Number.isNaN(price) || price < 0 || !form.categoryId) {
      toast.error(t("error.generic"));
      return;
    }

    startTransition(async () => {
      let itemId = form.id;
      if (itemId) {
        const res = await updateMenuItem({
          id: itemId,
          categoryId: form.categoryId,
          name,
          description: form.description.trim() || null,
          price,
          isAvailable: form.isAvailable,
          isActive: form.isActive,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
      } else {
        const res = await createMenuItem({
          categoryId: form.categoryId,
          name,
          description: form.description.trim() || null,
          price,
          isAvailable: form.isAvailable,
          isActive: form.isActive,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        itemId = res.data.id;
      }

      if (form.imageFile && itemId) {
        const fd = new FormData();
        fd.set("file", form.imageFile, "item.webp");
        const up = await uploadMenuImage({ menuItemId: itemId, formData: fd });
        if (!up.ok) {
          toast.error(up.error);
          router.refresh();
          return;
        }
      }

      toast.success(t("app.save"));
      setFormOpen(false);
      router.refresh();
    });
  };

  const imageSrc =
    form.imagePreview ?? menuImagePublicUrl(form.imagePath) ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-4 pt-3">
      <PageHeader
        title={t("menu.title")}
        subtitle={`${t("menu.statsItems", { n: itemCount })} • ${t("menu.statsCats", { n: categories.length })}`}
      />
      <PageHeaderActions>
        <button
          type="button"
          onClick={() => setCatsOpen(true)}
          className="bg-muted text-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-xl"
          aria-label={t("menu.manageCategories")}
        >
          <SlidersHorizontal className="size-5" />
        </button>
      </PageHeaderActions>

      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("menu.search")}
          className="border-border bg-muted text-foreground placeholder:text-muted-foreground h-12 rounded-2xl border ps-10 text-base"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCatFilter("all")}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
            catFilter === "all"
              ? "bg-brand-amber text-black"
              : "bg-muted text-muted-foreground",
          )}
        >
          {t("menu.all")}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCatFilter(c.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
              catFilter === c.id
                ? "bg-brand-amber text-black"
                : "bg-muted text-muted-foreground",
              !c.isActive && "opacity-50",
            )}
          >
            {c.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCatsOpen(true)}
          className="text-brand-amber bg-muted shrink-0 rounded-full px-4 py-2 text-sm font-medium"
        >
          {t("menu.addCategory")}
        </button>
      </div>

      <section className="border-border bg-card overflow-hidden rounded-2xl border">
        {visibleItems.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {categories.length === 0
              ? t("menu.noCategories")
              : t("menu.noItems")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visibleItems.map((item, index) => (
              <li key={item.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-3",
                    !item.isActive && "opacity-60",
                  )}
                >
                  {catFilter !== "all" ? (
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 border-border px-2 text-xs text-foreground"
                        disabled={pending || index === 0}
                        onClick={() => {
                          const ids = visibleItems.map((x) => x.id);
                          const tmp = ids[index]!;
                          ids[index] = ids[index - 1]!;
                          ids[index - 1] = tmp;
                          run(() =>
                            reorderItems({
                              categoryId: catFilter,
                              orderedIds: ids,
                            }),
                          );
                        }}
                      >
                        {t("menu.moveUp")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 border-border px-2 text-xs text-foreground"
                        disabled={pending || index === visibleItems.length - 1}
                        onClick={() => {
                          const ids = visibleItems.map((x) => x.id);
                          const tmp = ids[index]!;
                          ids[index] = ids[index + 1]!;
                          ids[index + 1] = tmp;
                          run(() =>
                            reorderItems({
                              categoryId: catFilter,
                              orderedIds: ids,
                            }),
                          );
                        }}
                      >
                        {t("menu.moveDown")}
                      </Button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-start"
                    onClick={() => openEdit(item)}
                  >
                    <ItemThumb name={item.name} imagePath={item.imagePath} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {item.name}
                        </span>
                        {!item.isAvailable ? (
                          <span className="rounded-md bg-destructive/15 px-1.5 py-0.5 text-xs font-medium text-destructive">
                            {t("item.soldOut")}
                          </span>
                        ) : null}
                        {!item.isActive ? (
                          <span className="rounded-md bg-card px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {t("menu.hidden")}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        <MoneyBdi amount={item.price} />
                      </span>
                    </span>
                  </button>
                  <Switch
                    checked={item.isAvailable}
                    disabled={pending}
                    className="data-checked:bg-brand-amber"
                    onCheckedChange={(v) =>
                      run(() =>
                        setItemAvailability({ id: item.id, isAvailable: v }),
                      )
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button
        type="button"
        disabled={pending}
        onClick={openCreate}
        className="h-14 w-full rounded-2xl bg-brand-amber text-base font-semibold text-black hover:bg-brand-amber/90"
      >
        {t("menu.newItemBtn")}
      </Button>

      {/* نموذج إضافة / تعديل الصنف */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent
          side="bottom"
          className="inset-x-0 bottom-0 h-[min(100dvh,40rem)] max-h-[100dvh] gap-0 overflow-y-auto rounded-t-3xl border-border bg-card p-0 sm:max-w-lg sm:justify-self-center"
        >
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="text-xl text-foreground">
              {form.id ? t("menu.editItem") : t("menu.newItem")}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 px-4 py-4 pb-28">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="relative flex h-36 w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-card"
            >
              {imageSrc ? (
                <Image
                  src={imageSrc}
                  alt=""
                  fill
                  className="object-cover opacity-60"
                />
              ) : null}
              <span className="relative z-10 flex flex-col items-center gap-2 text-brand-amber">
                <Camera className="size-7" />
                <span className="text-sm font-medium text-foreground">
                  {imageSrc ? t("menu.changeImage") : t("menu.addImage")}
                </span>
              </span>
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void compressAndKeep(f);
                e.target.value = "";
              }}
            />

            <Field label={t("menu.itemName")}>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t("menu.itemNamePlaceholder")}
                className="h-12 rounded-2xl border-0 bg-card ring-1 ring-border text-base text-foreground placeholder:text-muted-foreground"
              />
            </Field>

            <Field label={t("menu.descriptionOptional")}>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder={t("menu.descriptionPlaceholder")}
                className="h-12 rounded-2xl border-0 bg-card ring-1 ring-border text-base text-foreground placeholder:text-muted-foreground"
              />
            </Field>

            <Field label={t("menu.price")}>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price: e.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                  placeholder={t("menu.pricePlaceholder")}
                  className="h-12 rounded-2xl border-0 bg-card ring-1 ring-border pe-14 text-base text-foreground placeholder:text-muted-foreground"
                />
                <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {t("menu.currency")}
                </span>
              </div>
            </Field>

            <Field label={t("menu.category")}>
              <div className="relative">
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                  className="h-12 w-full appearance-none rounded-2xl border-0 bg-card ring-1 ring-border pe-10 ps-4 text-base text-foreground outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </Field>

            <ToggleRow
              title={t("menu.available")}
              hint={t("menu.availableHint")}
              checked={form.isAvailable}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, isAvailable: v }))
              }
            />
            <ToggleRow
              title={t("menu.visibleInMenu")}
              hint={t("menu.visibleHint")}
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
          </div>

          <div className="sticky bottom-0 flex gap-2 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              disabled={pending}
              onClick={saveForm}
              className="h-12 flex-1 rounded-2xl bg-brand-amber font-semibold text-black hover:bg-brand-amber/90"
            >
              {pending ? t("app.loading") : t("app.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setFormOpen(false)}
              className="h-12 shrink-0 rounded-2xl border-border px-5 text-foreground"
            >
              {t("app.cancel")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* إدارة التصنيفات */}
      <Sheet open={catsOpen} onOpenChange={setCatsOpen}>
        <SheetContent
          side="bottom"
          className="inset-x-0 bottom-0 max-h-[85dvh] gap-0 overflow-y-auto rounded-t-3xl border-border bg-card p-0 sm:max-w-lg sm:justify-self-center"
        >
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle>{t("menu.manageCategories")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-4 py-4 pb-8">
            <div className="flex gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={t("menu.categoryNamePlaceholder")}
                className="h-12 rounded-2xl border-0 bg-card ring-1 ring-border text-base placeholder:text-muted-foreground"
              />
              <Button
                type="button"
                disabled={pending || !newCatName.trim()}
                className="h-12 rounded-2xl bg-brand-amber px-4 text-black hover:bg-brand-amber/90"
                onClick={() => {
                  const name = newCatName.trim();
                  if (!name) return;
                  startTransition(async () => {
                    const res = await createCategory({ name });
                    if (!res.ok) toast.error(res.error);
                    else {
                      setNewCatName("");
                      toast.success(t("app.save"));
                      router.refresh();
                    }
                  });
                }}
              >
                {t("app.add")}
              </Button>
            </div>

            <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
              {categories.map((c, index) => (
                <li key={c.id} className="flex items-center gap-2 px-3 py-3">
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 border-border px-2 text-xs text-foreground"
                      disabled={pending || index === 0}
                      onClick={() => {
                        const ids = categories.map((x) => x.id);
                        const tmp = ids[index]!;
                        ids[index] = ids[index - 1]!;
                        ids[index - 1] = tmp;
                        run(() => reorderCategories({ orderedIds: ids }));
                      }}
                    >
                      {t("menu.moveUp")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 border-border px-2 text-xs text-foreground"
                      disabled={pending || index === categories.length - 1}
                      onClick={() => {
                        const ids = categories.map((x) => x.id);
                        const tmp = ids[index]!;
                        ids[index] = ids[index + 1]!;
                        ids[index + 1] = tmp;
                        run(() => reorderCategories({ orderedIds: ids }));
                      }}
                    >
                      {t("menu.moveDown")}
                    </Button>
                  </div>
                  <Input
                    defaultValue={c.name}
                    placeholder={t("menu.categoryNamePlaceholder")}
                    className="h-11 flex-1 rounded-xl border-0 bg-card ring-1 ring-border text-base placeholder:text-muted-foreground"
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== c.name) {
                        run(() => updateCategory({ id: c.id, name }));
                      }
                    }}
                  />
                  <Switch
                    checked={c.isActive}
                    className="data-checked:bg-brand-amber"
                    onCheckedChange={() =>
                      run(() => toggleCategory({ id: c.id }))
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  hint,
  checked,
  onCheckedChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 data-checked:bg-brand-amber"
      />
    </div>
  );
}
