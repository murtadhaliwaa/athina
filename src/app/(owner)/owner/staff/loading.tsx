import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerStaffLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pt-3">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
