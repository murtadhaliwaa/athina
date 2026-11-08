export default function WaiterNewOrderLoading() {
  return (
    <div className="animate-pulse space-y-3 p-4 pb-28">
      <div className="bg-muted h-8 w-44 rounded-lg" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted h-9 w-20 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted aspect-[4/5] rounded-2xl" />
        ))}
      </div>
      <div className="bg-muted fixed inset-x-0 bottom-0 h-20 border-t" />
    </div>
  );
}
