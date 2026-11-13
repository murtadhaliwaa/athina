import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensesLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <Skeleton className="h-10 w-40 rounded-xl bg-card" />
      <Skeleton className="h-24 w-full rounded-2xl bg-card" />
      <Skeleton className="h-48 w-full rounded-2xl bg-card" />
    </div>
  );
}
