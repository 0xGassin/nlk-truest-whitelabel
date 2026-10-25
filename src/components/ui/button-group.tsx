"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// eslint-disable-next-line @eslint-react/no-forward-ref
const ButtonGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn(
          "inline-flex items-center",
          "[&>button:first-child]:rounded-r-none [&>button:first-child]:border-r-0",
          "[&>button:not(:first-child):not(:last-child)]:rounded-none [&>button:not(:first-child):not(:last-child)]:border-x-0",
          "[&>button:last-child]:rounded-l-none [&>button:last-child]:border-l-0",
          "[&>button]:focus-visible:relative [&>button]:focus-visible:z-10",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
ButtonGroup.displayName = "ButtonGroup";

export { ButtonGroup };
