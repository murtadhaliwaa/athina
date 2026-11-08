export default function WaiterTableLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="bg-muted h-8 w-36 rounded-lg" />
      <div className="bg-muted h-4 w-48 rounded" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-muted h-28 w-full rounded-2xl" />
        ))}
      </div>
      <div className="bg-muted h-12 w-full rounded-xl" />
    </div>
  );
}
