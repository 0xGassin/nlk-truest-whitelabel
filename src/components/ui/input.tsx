import * as React from "react";

import { geistInputClassName, geistInputWrapperClassName } from "@/components/ui/geist-input";
import { cn } from "@/lib/utils";

function Input({ className, type, wrapperClassName, ...props }: React.ComponentProps<"input"> & { wrapperClassName?: string }) {
  return (
    <div className={cn(geistInputWrapperClassName, wrapperClassName)} data-slot="input-wrapper">
      <input className={cn(geistInputClassName, "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground", className)} data-slot="input" type={type} {...props} />
    </div>
  )
}

export { Input }
