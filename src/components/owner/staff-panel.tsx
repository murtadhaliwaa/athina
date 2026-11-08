"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  changeRole,
  createStaff,
  resetPin,
  setStaffActive,
} from "@/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { t } from "@/lib/i18n/ar-iq";
import { roleLabel } from "@/lib/i18n/role-label";
import type { Role } from "@prisma/client";

type StaffRow = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
};

export function StaffPanel({ staff }: { staff: StaffRow[] }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    role: "WAITER" as "WAITER" | "CASHIER",
    pin: "",
  });
  const [pinTarget, setPinTarget] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else toast.success(t("app.save"));
    });
  };

  return (
    <div className="space-y-6 p-4 pb-8">
      <section className="space-y-3 overflow-hidden rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold text-foreground">{t("staff.new")}</h2>
        <Input
          placeholder={t("staff.usernamePlaceholder")}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="h-11 text-base"
          dir="ltr"
        />
        <Input
          placeholder={t("staff.fullNamePlaceholder")}
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="h-11 text-base"
        />
        <Select
          value={form.role}
          onValueChange={(v) =>
            setForm({ ...form, role: v as "WAITER" | "CASHIER" })
          }
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue>
              {(value: string | null) =>
                value ? roleLabel(value) : t("staff.role")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WAITER">{roleLabel("WAITER")}</SelectItem>
            <SelectItem value="CASHIER">{roleLabel("CASHIER")}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={t("staff.pinPlaceholder")}
          value={form.pin}
          onChange={(e) => setForm({ ...form, pin: e.target.value })}
          className="h-11 text-base"
          inputMode="numeric"
          dir="ltr"
        />
        <Button
          className="h-11 w-full bg-brand-amber font-semibold text-black hover:bg-brand-amber/90"
          disabled={pending}
          onClick={() => run(() => createStaff(form))}
        >
          {pending ? t("app.loading") : t("app.add")}
        </Button>
      </section>

      {staff.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {t("empty.staff")}
        </p>
      ) : null}

      <ul className="space-y-3">
        {staff.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <p className="font-medium text-foreground">{s.fullName}</p>
            <p className="text-muted-foreground text-sm">
              {s.username} · {roleLabel(s.role)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["WAITER", "CASHIER"] as const)
                .filter((role) => role !== s.role)
                .map((role) => (
                  <AlertDialog key={role}>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="outline"
                          className="h-11"
                          disabled={pending}
                        >
                          {roleLabel(role)}
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("staff.confirmRole")}
                        </AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("confirm.no")}</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={pending}
                          onClick={() =>
                            run(() => changeRole({ id: s.id, role }))
                          }
                        >
                          {t("confirm.yes")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ))}

              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="h-11"
                      disabled={pending}
                    >
                      {s.isActive ? t("app.inactive") : t("app.active")}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {s.isActive
                        ? t("staff.confirmDisable")
                        : t("confirm.areYouSure")}
                    </AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("confirm.no")}</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          setStaffActive({ id: s.id, active: !s.isActive })
                        )
                      }
                    >
                      {t("confirm.yes")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog
                open={pinTarget === s.id}
                onOpenChange={(open) => {
                  if (open) setPinTarget(s.id);
                  else {
                    setPinTarget(null);
                    setNewPin("");
                  }
                }}
              >
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="h-11"
                      disabled={pending}
                    >
                      {t("staff.resetPin")}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("staff.newPin")}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <Input
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    dir="ltr"
                    className="h-11 text-base"
                    placeholder={t("staff.newPinPlaceholder")}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("confirm.no")}</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={pending || newPin.length !== 6}
                      onClick={() => {
                        const pin = newPin;
                        setPinTarget(null);
                        setNewPin("");
                        run(() => resetPin({ id: s.id, newPin: pin }));
                      }}
                    >
                      {t("confirm.yes")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
