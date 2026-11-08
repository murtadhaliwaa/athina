"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Image from "next/image";
import { loginOwner, loginWithPin } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n/ar-iq";

const USERNAME_KEY = "cafe_last_username";

/** أرقام عربية/إنجليزية → 0-9 فقط */
function normalizePin(raw: string) {
  const eastern = "٠١٢٣٤٥٦٧٨٩";
  let out = "";
  for (const c of raw) {
    const ei = eastern.indexOf(c);
    if (ei >= 0) out += String(ei);
    else if (c >= "0" && c <= "9") out += c;
    if (out.length >= 6) break;
  }
  return out;
}

function readSavedUsername() {
  try {
    return localStorage.getItem(USERNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function LoginForm() {
  const [mode, setMode] = useState<"staff" | "owner">("staff");
  const savedUsername = useSyncExternalStore(
    () => () => undefined,
    readSavedUsername,
    () => "",
  );
  const [usernameOverride, setUsernameOverride] = useState<string | null>(null);
  const username = usernameOverride ?? savedUsername;
  const setUsername = (v: string) => setUsernameOverride(v);
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onStaffSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // FormData يغطي حالة الجوال عندما يظهر الرقم في الحقل دون تحديث state
    const fd = new FormData(e.currentTarget);
    const u = String(fd.get("username") ?? username).trim();
    const p = normalizePin(String(fd.get("pin") ?? pin));
    setUsername(u);
    setPin(p);

    if (!u || p.length !== 6) {
      setError(t("auth.error"));
      return;
    }

    startTransition(async () => {
      const result = await loginWithPin({ username: u, pin: p });
      if (!result.ok) {
        setError(result.error);
        setPin("");
        return;
      }
      localStorage.setItem(USERNAME_KEY, u.toLowerCase());
      // تنقل كامل أوثق على Safari/الموبايل من router.replace أثناء بث RSC
      window.location.assign(result.data.redirectTo);
    });
  }

  function onOwnerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginOwner({ email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.assign(result.data.redirectTo);
    });
  }

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <Image
          src="/brand/athena-logo.png"
          alt={t("app.shortName")}
          width={160}
          height={172}
          priority
          className="h-auto w-28 sm:w-32"
        />
        <h1 className="text-balance font-heading text-2xl font-bold tracking-tight text-foreground">
          {t("app.name")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {mode === "staff" ? t("auth.login") : t("auth.ownerLogin")}
        </p>
      </header>

      {mode === "staff" ? (
        <form
          method="post"
          onSubmit={onStaffSubmit}
          className="flex flex-col gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="username">{t("auth.username")}</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              dir="ltr"
              className="h-12 text-base"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("auth.usernamePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin">{t("auth.pin")}</Label>
            <Input
              id="pin"
              name="pin"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              enterKeyHint="go"
              maxLength={6}
              dir="ltr"
              className="h-14 text-center text-2xl tracking-[0.55em] font-mono"
              value={pin}
              onChange={(e) => setPin(normalizePin(e.target.value))}
              required
            />
          </div>

          {error ? (
            <p className="text-destructive text-center text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full bg-brand-amber text-base font-semibold text-black hover:bg-brand-amber/90"
            disabled={pending}
          >
            {pending ? t("app.loading") : t("auth.login")}
          </Button>

          <button
            type="button"
            className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            onClick={() => {
              setMode("owner");
              setError(null);
            }}
          >
            {t("auth.ownerLogin")}
          </button>
        </form>
      ) : (
        <form
          method="post"
          onSubmit={onOwnerSubmit}
          className="flex flex-col gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              dir="ltr"
              className="h-12 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              className="h-12 text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              required
            />
          </div>

          {error ? (
            <p className="text-destructive text-center text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full bg-brand-amber text-base font-semibold text-black hover:bg-brand-amber/90"
            disabled={pending}
          >
            {pending ? t("app.loading") : t("auth.login")}
          </Button>

          <button
            type="button"
            className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            onClick={() => {
              setMode("staff");
              setError(null);
            }}
          >
            {t("auth.staffLogin")}
          </button>
        </form>
      )}
    </div>
  );
}
