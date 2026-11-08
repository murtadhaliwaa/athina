export default function LoginLoading() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm animate-pulse space-y-4 rounded-2xl border border-brand-gold/20 bg-brand-charcoal p-6">
        <div className="bg-muted mx-auto h-10 w-36 rounded-lg" />
        <div className="bg-muted h-11 w-full rounded-xl" />
        <div className="bg-muted h-11 w-full rounded-xl" />
        <div className="bg-muted h-11 w-full rounded-xl" />
      </div>
    </main>
  );
}
