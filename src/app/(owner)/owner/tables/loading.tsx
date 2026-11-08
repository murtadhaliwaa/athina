import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerTablesLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pt-3">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
