export default function CashierHistoryLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="bg-muted h-8 w-40 rounded-lg" />
      <div className="bg-muted h-11 w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
