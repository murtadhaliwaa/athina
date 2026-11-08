import { cn } from "@/lib/utils";

/** اسم الصنف + التصنيف (مثلاً عصير / أركيلة) حتى ما يختلط المتشابه */
export function OrderItemLabel({
  name,
  category,
  note,
  className,
}: {
  name: string;
  category?: string | null;
  note?: string | null;
  className?: string;
}) {
  const cat = category?.trim();
  return (
    <span className={cn("min-w-0", className)}>
      {cat ? (
        <span className="text-muted-foreground block text-xs leading-tight">
          {cat}
        </span>
      ) : null}
      <span className="font-medium leading-snug">{name}</span>
      {note ? (
        <span className="text-muted-foreground block text-xs leading-tight">
          — {note}
        </span>
      ) : null}
    </span>
  );
}

export function QtyChip({ quantity }: { quantity: number }) {
  return (
    <span className="bg-brand-amber/15 inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-semibold">
      <bdi dir="ltr">×{quantity}</bdi>
    </span>
  );
}
