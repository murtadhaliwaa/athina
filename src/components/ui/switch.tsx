"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent p-0.5 transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "data-[size=default]:h-6 data-[size=default]:w-11",
        "data-[size=sm]:h-5 data-[size=sm]:w-9",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-[margin] duration-200",
          "dark:data-checked:bg-primary-foreground dark:data-unchecked:bg-foreground",
          "group-data-[size=default]/switch:size-5",
          "group-data-[size=sm]/switch:size-4",
          // محاذاة منطقية (RTL/LTR) بدل translate-x
          "ms-0 data-checked:ms-auto"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
