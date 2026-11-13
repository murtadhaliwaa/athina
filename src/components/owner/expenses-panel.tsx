"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  createExpense,
  updateExpense,
  voidExpense,
} from "@/actions/expenses";
import type { ExpenseListItem } from "@/actions/expenses";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { ReportExportButtons } from "@/components/owner/reports/report-export-buttons";
import { PageHeader } from "@/components/shared/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXPENSE_CATEGORY_IDS,
  isExpenseCategoryId,
  type ExpenseCategoryId,
} from "@/lib/expenses/categories";
import { expenseCategoryLabel } from "@/lib/expenses/labels";
import { formatIQD } from "@/lib/money";
import type { ReportPreset } from "@/lib/reports/date-range";
import { formatBaghdadDate, formatBaghdadDateLong } from "@/lib/time";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

function cleanNote(note: string | null | undefined) {
  return (note ?? "")
    .replace(/\s*·\s*بيانات معاينة/g, "")
    .replace(/\s*·\s*__demo_expense__/g, "")
    .replace(/بيانات معاينة/g, "")
    .replace(/__demo_expense__/g, "")
    .trim();
}

type DayGroup = {
  date: string;
  total: number;
  items: ExpenseListItem[];
};

function groupByDay(items: ExpenseListItem[]): DayGroup[] {
  const map = new Map<string, ExpenseListItem[]>();
  for (const item of items) {
    const list = map.get(item.businessDate) ?? [];
    list.push(item);
    map.set(item.businessDate, list);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, rows]) => ({
      date,
      total: rows.reduce((sum, r) => sum + r.amount, 0),
      items: rows,
    }));
}

function addCalendarDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
  }).format(d);
}

function monthBounds(ymd: string): { start: string; end: string } {
  const [y, m] = ymd.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function monthLabelAr(monthStart: string): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    timeZone: "Asia/Baghdad",
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthStart}T12:00:00+03:00`));
}

/** أشهر السنة الحالية من كانون الثاني حتى الشهر الحالي (الأحدث أولاً) */
function yearMonthsToDate(today: string) {
  const [y, m] = today.split("-").map(Number);
  const out: { start: string; end: string; label: string }[] = [];
  for (let i = 0; i < m; i++) {
    const mm = m - i;
    const start = `${y}-${String(mm).padStart(2, "0")}-01`;
    const { end: monthEnd } = monthBounds(start);
    const end = i === 0 && today < monthEnd ? today : monthEnd;
    out.push({ start, end, label: monthLabelAr(start) });
  }
  return out;
}

type PeriodSeg = "thisMonth" | "lastMonth" | "other";

export function ExpensesPanel({
  expenseTotal,
  salesTotal,
  net,
  count,
  items,
  todayBusinessDate,
}: {
  expenseTotal: number;
  salesTotal: number;
  net: number;
  count: number;
  items: ExpenseListItem[];
  todayBusinessDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategoryId>("supplies");
  const [note, setNote] = useState("");
  const [businessDate, setBusinessDate] = useState(todayBusinessDate);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const preset = (searchParams.get("preset") as ReportPreset) || "thisMonth";
  const rangeFrom = searchParams.get("from");
  const rangeTo = searchParams.get("to");

  const lastMonthBounds = useMemo(() => {
    const prev = addCalendarDays(monthBounds(todayBusinessDate).start, -1);
    return monthBounds(prev);
  }, [todayBusinessDate]);

  const months = useMemo(
    () => yearMonthsToDate(todayBusinessDate),
    [todayBusinessDate],
  );

  const activeSeg: PeriodSeg = useMemo(() => {
    if (preset === "thisMonth") return "thisMonth";
    if (
      preset === "custom" &&
      rangeFrom === lastMonthBounds.start &&
      rangeTo === lastMonthBounds.end
    ) {
      return "lastMonth";
    }
    if (preset === "custom") return "other";
    return "other";
  }, [preset, rangeFrom, rangeTo, lastMonthBounds]);

  const dayGroups = useMemo(() => groupByDay(items), [items]);
  const exportHeaders = useMemo(
    () => [
      t("reports.colDate"),
      t("expense.itemTitle"),
      t("expense.category"),
      t("expense.amount"),
      t("expense.note"),
      t("expense.colBy"),
    ],
    [],
  );
  const exportRows = useMemo(
    () =>
      items.map((item) => [
        formatBaghdadDate(item.businessDate),
        item.title,
        expenseCategoryLabel(item.category),
        item.amount,
        cleanNote(item.note),
        item.createdByName,
      ]),
    [items],
  );
  const editingTitle = editingId
    ? items.find((i) => i.id === editingId)?.title
    : null;
  const editingAmount = editingId
    ? items.find((i) => i.id === editingId)?.amount
    : null;
  const netPositive = net >= 0;

  function pushRange(nextPreset: ReportPreset, from?: string, to?: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("preset", nextPreset);
    if (nextPreset === "custom" && from && to) {
      p.set("from", from);
      p.set("to", to);
    } else {
      p.delete("from");
      p.delete("to");
    }
    startTransition(() => {
      router.push(`${pathname}?${p.toString()}`);
    });
  }

  function selectThisMonth() {
    pushRange("thisMonth");
  }

  function selectLastMonth() {
    pushRange("custom", lastMonthBounds.start, lastMonthBounds.end);
  }

  function selectOtherMonth() {
    const { start, end } = monthBounds(todayBusinessDate);
    pushRange(
      "custom",
      start,
      todayBusinessDate < end ? todayBusinessDate : end,
    );
  }

  function applyMonth(start: string, end: string) {
    pushRange("custom", start, end);
  }

  function resetForm() {
    setEditingId(null);
    setFormOpen(false);
    setAmount("");
    setTitle("");
    setCategory("supplies");
    setNote("");
    setBusinessDate(todayBusinessDate);
    setAmountError(null);
    setTitleError(null);
  }

  function openCreate() {
    setEditingId(null);
    setAmount("");
    setTitle("");
    setCategory("supplies");
    setNote("");
    setBusinessDate(todayBusinessDate);
    setAmountError(null);
    setTitleError(null);
    setFormOpen(true);
  }

  function startEdit(item: ExpenseListItem) {
    setEditingId(item.id);
    setAmount(String(item.amount));
    setTitle(item.title);
    setCategory(
      isExpenseCategoryId(item.category) ? item.category : "other",
    );
    setNote(cleanNote(item.note));
    setBusinessDate(item.businessDate);
    setAmountError(null);
    setTitleError(null);
    setFormOpen(true);
  }

  function onSave() {
    const parsedAmount = parseInt(amount, 10);
    let ok = true;
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
      setAmountError(t("expense.amountRequired"));
      ok = false;
    } else {
      setAmountError(null);
    }
    if (title.trim().length < 2) {
      setTitleError(t("expense.titleRequired"));
      ok = false;
    } else {
      setTitleError(null);
    }
    if (!ok) return;

    const payload = {
      amount: parsedAmount,
      title: title.trim(),
      category,
      note: note.trim() ? note.trim() : null,
      businessDate: businessDate || todayBusinessDate,
    };

    startTransition(async () => {
      const res = editingId
        ? await updateExpense({ ...payload, expenseId: editingId })
        : await createExpense(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(editingId ? t("expense.updated") : t("expense.saved"));
      resetForm();
      router.refresh();
    });
  }

  function onVoid() {
    if (!editingId || voidReason.trim().length < 3) return;
    const id = editingId;
    const reason = voidReason.trim();
    startTransition(async () => {
      const res = await voidExpense({ expenseId: id, reason });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setVoidOpen(false);
      setVoidReason("");
      resetForm();
      router.refresh();
    });
  }

  const segs: { id: PeriodSeg; label: string; onSelect: () => void }[] = [
    {
      id: "thisMonth",
      label: t("expense.segThisMonth"),
      onSelect: selectThisMonth,
    },
    {
      id: "lastMonth",
      label: t("expense.segLastMonth"),
      onSelect: selectLastMonth,
    },
    {
      id: "other",
      label: t("expense.segOtherMonth"),
      onSelect: selectOtherMonth,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-4 pt-2 pb-32">
      <PageHeader title={t("expense.title")} subtitle={t("expense.subtitle")} />

      {/* Segmented control — أسلوب iOS */}
      <div
        className="bg-foreground/[0.06] grid grid-cols-3 gap-0.5 rounded-xl p-0.5 dark:bg-white/[0.08]"
        role="tablist"
        aria-label={t("expense.pickMonth")}
      >
        {segs.map((seg) => {
          const active = activeSeg === seg.id;
          return (
            <button
              key={seg.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={pending}
              onClick={seg.onSelect}
              className={cn(
                "h-9 rounded-[10px] text-[13px] font-semibold transition-all disabled:opacity-60",
                active
                  ? "bg-card text-foreground shadow-sm dark:bg-[#2c2c2e]"
                  : "text-muted-foreground",
              )}
            >
              {seg.label}
            </button>
          );
        })}
      </div>

      {activeSeg === "other" ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {months.map((m) => {
            const active = rangeFrom === m.start && rangeTo === m.end;
            return (
              <button
                key={m.start}
                type="button"
                disabled={pending}
                onClick={() => applyMonth(m.start, m.end)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-[13px] font-medium transition-colors disabled:opacity-60",
                  active
                    ? "bg-brand-amber text-black"
                    : "bg-foreground/[0.06] text-foreground dark:bg-white/[0.08]",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* بطل: الصافي — التصميم السابق */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-muted-foreground text-sm">{t("expense.net")}</p>
        <p
          className={cn(
            "mt-1 text-3xl font-bold tracking-tight",
            netPositive ? "text-emerald-500" : "text-[#C45C5C]",
          )}
        >
          <MoneyBdi amount={net} />
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-foreground/[0.04] px-3 py-2.5 dark:bg-white/[0.04]">
            <p className="text-muted-foreground text-xs">{t("expense.total")}</p>
            <p className="mt-0.5 text-lg font-semibold">
              <MoneyBdi amount={expenseTotal} />
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {t("expense.count", { n: count })}
            </p>
          </div>
          <div className="rounded-xl bg-foreground/[0.04] px-3 py-2.5 dark:bg-white/[0.04]">
            <p className="text-muted-foreground text-xs">{t("expense.sales")}</p>
            <p className="mt-0.5 text-lg font-semibold">
              <MoneyBdi amount={salesTotal} />
            </p>
          </div>
        </div>
        {exportRows.length > 0 ? (
          <div className="mt-4">
            <ReportExportButtons
              filename="expenses"
              title={t("expense.exportTitle")}
              headers={exportHeaders}
              rows={exportRows}
              csv={false}
            />
          </div>
        ) : null}
      </section>

      {/* نموذج — ورقة نظيفة */}
      {formOpen ? (
        <section className="space-y-4 rounded-[20px] bg-card p-5 shadow-sm dark:bg-[#1c1c1e]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold tracking-tight">
              {editingId
                ? t("expense.editNamed", {
                    title: editingTitle ?? t("expense.edit"),
                  })
                : t("expense.add")}
            </h2>
            <button
              type="button"
              disabled={pending}
              onClick={resetForm}
              className="text-[15px] font-medium text-brand-gold disabled:opacity-60"
            >
              {editingId ? t("expense.cancelEdit") : t("expense.closeForm")}
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="expense-amount"
                className="text-muted-foreground text-[13px] font-normal"
              >
                {t("expense.amount")}
              </Label>
              <div className="relative">
                <Input
                  id="expense-amount"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  className="h-12 rounded-xl border-0 bg-foreground/[0.06] pe-3 ps-12 text-end text-[17px] tabular-nums dark:bg-white/[0.08]"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value.replace(/[^\d]/g, ""));
                    setAmountError(null);
                  }}
                  disabled={pending}
                />
                <span className="text-muted-foreground pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs">
                  د.ع
                </span>
              </div>
              {amountError ? (
                <p className="text-destructive text-xs">{amountError}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="expense-title"
                className="text-muted-foreground text-[13px] font-normal"
              >
                {t("expense.itemTitle")}
              </Label>
              <Input
                id="expense-title"
                className="h-12 rounded-xl border-0 bg-foreground/[0.06] text-[17px] dark:bg-white/[0.08]"
                placeholder={t("expense.itemTitlePlaceholder")}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError(null);
                }}
                disabled={pending}
              />
              {titleError ? (
                <p className="text-destructive text-xs">{titleError}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="expense-category"
                  className="text-muted-foreground text-[13px] font-normal"
                >
                  {t("expense.category")}
                </Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    if (v && isExpenseCategoryId(v)) setCategory(v);
                  }}
                  disabled={pending}
                >
                  <SelectTrigger
                    id="expense-category"
                    className="h-12 w-full rounded-xl border-0 bg-foreground/[0.06] dark:bg-white/[0.08]"
                  >
                    <SelectValue>{expenseCategoryLabel(category)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORY_IDS.map((id) => (
                      <SelectItem key={id} value={id}>
                        {expenseCategoryLabel(id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="expense-date"
                  className="text-muted-foreground text-[13px] font-normal"
                >
                  {t("expense.businessDate")}
                </Label>
                <Input
                  id="expense-date"
                  type="date"
                  dir="ltr"
                  className="h-12 rounded-xl border-0 bg-foreground/[0.06] text-[15px] dark:bg-white/[0.08]"
                  value={businessDate}
                  onChange={(e) => setBusinessDate(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="expense-note"
                className="text-muted-foreground text-[13px] font-normal"
              >
                {t("expense.note")}
              </Label>
              <Input
                id="expense-note"
                className="h-12 rounded-xl border-0 bg-foreground/[0.06] text-[17px] dark:bg-white/[0.08]"
                placeholder={t("expense.notePlaceholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={pending}
              />
            </div>
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
                ? t("expense.update")
                : t("expense.save")}
          </Button>

          {editingId ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setVoidOpen(true)}
              className="text-destructive w-full py-2 text-center text-[15px] font-medium disabled:opacity-60"
            >
              {t("expense.void")}
            </button>
          ) : null}
        </section>
      ) : null}

      {/* قائمة inset مجمّعة — مثل Settings / Wallet */}
      {dayGroups.length === 0 ? (
        <p className="text-muted-foreground px-2 py-16 text-center text-[15px]">
          {t("expense.empty")}
        </p>
      ) : (
        <div className="space-y-6">
          {dayGroups.map((group) => (
            <section key={group.date}>
              <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
                <h3 className="text-muted-foreground text-[13px] font-semibold tracking-wide uppercase">
                  {formatBaghdadDateLong(group.date)}
                </h3>
                <p className="text-muted-foreground text-[13px] tabular-nums">
                  <MoneyBdi amount={group.total} />
                </p>
              </div>
              <ul className="overflow-hidden rounded-[14px] bg-card dark:bg-[#1c1c1e]">
                {group.items.map((item, idx) => {
                  const displayNote = cleanNote(item.note);
                  const active = editingId === item.id;
                  return (
                    <li key={item.id}>
                      {idx > 0 ? (
                        <div
                          className="bg-border/80 ms-4 h-px dark:bg-white/[0.08]"
                          aria-hidden
                        />
                      ) : null}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startEdit(item)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors active:bg-foreground/[0.04]",
                          active && "bg-brand-amber/10",
                        )}
                        aria-label={`${t("expense.tapToEdit")}: ${item.title}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px] font-medium leading-snug">
                            {item.title}
                          </p>
                          <p className="text-muted-foreground mt-0.5 text-[13px]">
                            {expenseCategoryLabel(item.category)}
                            {displayNote ? ` · ${displayNote}` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 text-[16px] font-semibold tabular-nums">
                          <MoneyBdi amount={item.amount} />
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* زر عائم دائري — أسلوب آبل */}
      {!formOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
          <Button
            type="button"
            className="pointer-events-auto h-12 rounded-full bg-brand-amber px-8 text-[16px] font-semibold text-black shadow-[0_8px_28px_rgba(0,0,0,0.35)] hover:bg-brand-amber/90"
            onClick={openCreate}
          >
            {t("expense.add")}
          </Button>
        </div>
      ) : null}

      <AlertDialog
        open={voidOpen}
        onOpenChange={(open) => {
          if (!open) {
            setVoidOpen(false);
            setVoidReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingTitle != null && editingAmount != null
                ? t("expense.voidNamed", {
                    title: editingTitle,
                    amount: formatIQD(editingAmount),
                  })
                : t("expense.voidConfirm")}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="void-reason">{t("expense.voidReason")}</Label>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={t("expense.voidReasonPlaceholder")}
              className="text-base"
            />
            <p className="text-muted-foreground text-xs">
              {t("expense.voidReasonHint")}
            </p>
          </div>
          <AlertDialogFooter className="grid grid-cols-2">
            <AlertDialogCancel disabled={pending}>
              {t("confirm.no")}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "h-11",
              )}
              disabled={pending || voidReason.trim().length < 3}
              onClick={onVoid}
            >
              {pending ? t("app.loading") : t("confirm.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
