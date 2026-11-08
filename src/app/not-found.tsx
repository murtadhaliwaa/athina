import Link from "next/link";
import { t } from "@/lib/i18n/ar-iq";

export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">{t("error.notFound")}</h1>
      <p className="text-muted-foreground text-sm">{t("error.generic")}</p>
      <Link
        href="/"
        className="bg-brand-amber inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-black"
      >
        {t("nav.home")}
      </Link>
    </main>
  );
}