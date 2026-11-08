import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerMenuLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pt-3">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-full rounded-full" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
