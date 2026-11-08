export default function CashierLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="bg-muted h-8 w-40 rounded-lg" />
      <div className="bg-muted h-4 w-56 rounded" />
      <div className="bg-muted h-24 w-full rounded-2xl" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
