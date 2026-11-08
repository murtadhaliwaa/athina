export default function CashierBillLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="bg-muted h-8 w-40 rounded-lg" />
      <div className="bg-muted h-24 w-full rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted h-14 w-full rounded-xl" />
        ))}
      </div>
      <div className="bg-muted h-12 w-full rounded-xl" />
      <div className="bg-muted h-12 w-full rounded-xl" />
    </div>
  );
}
