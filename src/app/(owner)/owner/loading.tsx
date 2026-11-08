import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pt-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-full rounded-full" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
