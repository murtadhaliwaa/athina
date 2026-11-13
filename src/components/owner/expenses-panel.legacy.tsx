"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createExpense,
  updateExpense,
  voidExpense,
} from "@/actions/expenses";
import type { ExpenseListItem } from "@/actions/expenses";
import { ReportDateFilter } from "@/components/owner/reports/report-date-filter";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { PageHeader } from "@/components/shared/page-header";
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
import { formatBaghdadDateTime } from "@/lib/format-datetime";
import { formatBaghdadDateLong } from "@/lib/time";
import { t } from "@/lib/i18n/ar-iq";

function formatExpenseDay(isoDate: string) {
  return formatBaghdadDateLong(isoDate);
}

function cleanNote(note: string | null | undefined) {
  return (note ?? "")
    .replace(/\s*·\s*بيانات معاينة/g, "")
    .replace(/\s*·\s*__demo_expense__/g, "")
    .replace(/بيانات معاينة/g, "")
    .replace(/__demo_expense__/g, "")
    .trim();
}

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
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategoryId>("supplies");
  const [note, setNote] = useState("");
  const [businessDate, setBusinessDate] = useState(todayBusinessDate);
  const [voidReason, setVoidReason] = useState("");
  const [voidTarget, setVoidTarget] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setAmount("");
    setTitle("");
    setCategory("supplies");
    setNote("");
    setBusinessDate(todayBusinessDate);
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
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function onSave() {
    const parsedAmount = parseInt(amount, 10);
    const payload = {
      amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
      title,
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 pb-8">
      <PageHeader title={t("expense.title")} subtitle={t("expense.subtitle")} />

      <ReportDateFilter />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">{t("expense.sales")}</p>
          <p className="mt-1 text-xl font-bold">
            <MoneyBdi amount={salesTotal} />
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">{t("expense.total")}</p>
          <p className="mt-1 text-xl font-bold">
            <MoneyBdi amount={expenseTotal} />
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("expense.count", { n: count })}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-card p-4">
          <p className="text-muted-foreground text-xs">{t("expense.net")}</p>
          <p className="mt-1 text-xl font-bold">
            <MoneyBdi amount={net} />
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold">
          {editingId ? t("expense.edit") : t("expense.add")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="expense-amount">{t("expense.amount")}</Label>
            <Input
              id="expense-amount"
              type="number"
              inputMode="numeric"
              dir="ltr"
              className="h-11 rounded-xl text-base tabular-nums"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-date">{t("expense.businessDate")}</Label>
            <Input
              id="expense-date"
              type="date"
              dir="ltr"
              className="h-11 rounded-xl text-base"
              value={businessDate}
              onChange={(e) => setBusinessDate(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="expense-title">{t("expense.itemTitle")}</Label>
            <Input
              id="expense-title"
              className="h-11 rounded-xl text-base"
              placeholder={t("expense.itemTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("expense.category")}</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                if (v && isExpenseCategoryId(v)) setCategory(v);
              }}
              disabled={pending}
            >
              <SelectTrigger className="h-11 w-full rounded-xl">
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
            <Label htmlFor="expense-note">{t("expense.note")}</Label>
            <Input
              id="expense-note"
              className="h-11 rounded-xl text-base"
              placeholder={t("expense.notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-11 min-w-36 rounded-xl bg-brand-amber font-semibold text-black hover:bg-brand-amber/90"
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
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={pending}
              onClick={resetForm}
            >
              {t("expense.cancelEdit")}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        {items.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            {t("expense.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const displayNote = cleanNote(item.note);
              const isEditing = editingId === item.id;
              return (
                <li
                  key={item.id}
                  className={
                    isEditing
                      ? "bg-brand-amber/5 flex items-start gap-3 px-4 py-3.5"
                      : "flex items-start gap-3 px-4 py-3.5"
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {expenseCategoryLabel(item.category)}
                      {" · "}
                      {formatExpenseDay(item.businessDate)}
                      {" · "}
                      {item.createdByName}
                    </p>
                    {displayNote ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {displayNote}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {formatBaghdadDateTime(new Date(item.createdAt))}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-base font-semibold">
                      <MoneyBdi amount={item.amount} />
                    </p>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg"
                        disabled={pending}
                        onClick={() => startEdit(item)}
                      >
                        {t("app.edit")}
                      </Button>
                      <AlertDialog
                        open={voidTarget === item.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setVoidTarget(null);
                            setVoidReason("");
                          }
                        }}
                      >
                        <AlertDialogTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-lg"
                              disabled={pending}
                              onClick={() => setVoidTarget(item.id)}
                            >
                              {t("expense.void")}
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("expense.voidConfirm")}
                            </AlertDialogTitle>
                          </AlertDialogHeader>
                          <Textarea
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder={t("expense.voidReasonPlaceholder")}
                            className="text-base"
                          />
                          <AlertDialogFooter className="grid grid-cols-2">
                            <AlertDialogCancel disabled={pending}>
                              {t("confirm.no")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              disabled={
                                pending || voidReason.trim().length < 3
                              }
                              onClick={() => {
                                if (
                                  !voidTarget ||
                                  voidReason.trim().length < 3
                                ) {
                                  return;
                                }
                                const id = voidTarget;
                                const reason = voidReason.trim();
                                startTransition(async () => {
                                  const res = await voidExpense({
                                    expenseId: id,
                                    reason,
                                  });
                                  if (!res.ok) {
                                    toast.error(res.error);
                                    return;
                                  }
                                  if (editingId === id) resetForm();
                                  setVoidTarget(null);
                                  setVoidReason("");
                                  router.refresh();
                                });
                              }}
                            >
                              {pending ? t("app.loading") : t("confirm.yes")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
