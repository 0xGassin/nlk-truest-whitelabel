"use client";

import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils";

// eslint-disable-next-line @eslint-react/no-forward-ref
const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  {
    thumbClassName?: string;
  } & React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, thumbClassName, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border/60 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#2563eb] data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-700",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0",
        thumbClassName,
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
