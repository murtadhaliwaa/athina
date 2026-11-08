"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createTable,
  reorderTables,
  toggleTable,
  updateTable,
} from "@/actions/tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/i18n/ar-iq";

type TableRow = { id: string; label: string; sortOrder: number; isActive: boolean };

export function TablesPanel({ tables }: { tables: TableRow[] }) {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [rows, setRows] = useState(tables);
  const [tablesBaseline, setTablesBaseline] = useState(tables);
  if (tables !== tablesBaseline) {
    setTablesBaseline(tables);
    setRows(tables);
  }

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= rows.length) return;
    const copy = [...rows];
    const tmp = copy[index]!;
    copy[index] = copy[next]!;
    copy[next] = tmp;
    // حدّث sortOrder محلياً حتى لا يكتب blur قيمة قديمة فوق الترتيب
    const withOrder = copy.map((r, i) => ({ ...r, sortOrder: i + 1 }));
    setRows(withOrder);
    run(() => reorderTables({ orderedIds: withOrder.map((r) => r.id) }));
  };

  return (
    <div className="space-y-4 p-4 pb-8">
      <div className="flex gap-2 rounded-2xl border border-border bg-card p-3">
        <Input
          placeholder={t("tables.labelPlaceholder")}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-11 text-base"
        />
        <Button
          className="h-11 bg-brand-amber font-semibold text-black hover:bg-brand-amber/90"
          disabled={pending || !label.trim()}
          onClick={() => run(() => createTable({ label: label.trim() }))}
        >
          {pending ? t("app.loading") : t("app.add")}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {t("empty.tables")}
        </p>
      ) : null}

      <ul className="space-y-2">
        {rows.map((table, index) => (
          <li
            key={table.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3"
          >
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 border-border"
                disabled={pending || index === 0}
                onClick={() => move(index, -1)}
              >
                {t("tables.moveUp")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 border-border"
                disabled={pending || index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                {t("tables.moveDown")}
              </Button>
            </div>
            <Input
              defaultValue={table.label}
              placeholder={t("tables.labelPlaceholder")}
              className="h-11 max-w-[8rem] text-base"
              onBlur={(e) => {
                if (e.target.value !== table.label) {
                  run(() =>
                    updateTable({
                      id: table.id,
                      label: e.target.value.trim(),
                      sortOrder: table.sortOrder,
                    }),
                  );
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={table.isActive}
                onCheckedChange={() => run(() => toggleTable({ id: table.id }))}
              />
              <span className="text-sm">
                {table.isActive ? t("app.active") : t("app.inactive")}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
