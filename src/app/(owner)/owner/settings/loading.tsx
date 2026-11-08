import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerSettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pt-3">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
