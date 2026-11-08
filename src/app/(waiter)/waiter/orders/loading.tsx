export default function WaiterOrdersLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="bg-muted h-8 w-36 rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted h-28 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
