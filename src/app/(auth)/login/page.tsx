import { LoginForm } from "@/components/auth/login-form";
import { InstallAppBanner } from "@/components/shared/install-app-banner";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-1 items-center justify-center overflow-x-hidden bg-background px-4 py-10 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--brand-gold)_0%,transparent_46%)] opacity-[0.10] dark:opacity-[0.14]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_35%,var(--brand-charcoal)_100%)] opacity-25 dark:opacity-60"
      />
      <div className="absolute top-4 end-4 z-10">
        <ThemeToggle />
      </div>
      <LoginForm />
      <InstallAppBanner />
    </main>
  );
}
