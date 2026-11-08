export default function WaiterLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="bg-muted h-8 w-40 rounded-lg" />
      <div className="bg-muted h-4 w-56 rounded" />
      <div className="flex gap-2 pt-2">
        <div className="bg-muted h-9 w-16 rounded-full" />
        <div className="bg-muted/70 h-9 w-16 rounded-full" />
        <div className="bg-muted/70 h-9 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2.5 pt-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-muted min-h-[6.5rem] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
