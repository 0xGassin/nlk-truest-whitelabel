import * as React from "react";

import { cn } from "@/lib/utils";

/** Geist-style shadow border shared across inputs, selects, and bordered buttons. */
export const geistShadowBorderClassName = "shadow-[0_0_0_1.1px_#eaeaea] dark:shadow-[0_0_0_1.1px_oklch(1_0_0_/_10%)]";

export const geistShadowBorderHoverClassName = "hover:shadow-[0_0_0_1.1px_#cccccc] dark:hover:shadow-[0_0_0_1.1px_oklch(1_0_0_/_18%)]";

export const geistShadowBorderFocusClassName =
  "focus-visible:shadow-[0_0_0_1.1px_#cccccc,0px_0px_0px_2px_rgba(0,0,0,0.08)] focus-visible:ring-0 dark:focus-visible:shadow-[0_0_0_1.1px_oklch(1_0_0_/_18%),0px_0px_0px_2px_oklch(1_0_0_/_10%)]";

export const geistShadowBorderWrapperFocusClassName =
  "has-[:focus]:!shadow-[0_0_0_1.1px_#cccccc,0px_0px_0px_2px_rgba(0,0,0,0.08)] dark:has-[:focus]:!shadow-[0_0_0_1.1px_oklch(1_0_0_/_18%),0px_0px_0px_2px_oklch(1_0_0_/_10%)]";

export const geistFieldTransitionClassName = "border-none transition-all duration-150 outline-none";

export const geistInputWrapperClassName = cn(
  "flex h-11 max-w-full w-full rounded-md bg-white text-sm font-normal dark:bg-card",
  geistFieldTransitionClassName,
  geistShadowBorderClassName,
  geistShadowBorderHoverClassName,
  geistShadowBorderWrapperFocusClassName,
  "hover:[&:has(input:disabled)]:shadow-[0_0_0_1px_#eaeaea] dark:hover:[&:has(input:disabled)]:shadow-[0_0_0_1px_oklch(1_0_0_/_12%)]",
  "has-[input[aria-invalid=true]]:shadow-[0_0_0_1px_hsl(var(--destructive))] has-[input[aria-invalid=true]]:has-[:focus]:!shadow-[0_0_0_1px_hsl(var(--destructive)),0px_0px_0px_2px_hsl(var(--destructive)/0.15)]",
);

export const geistInputClassName = cn(
  "inline-flex h-full min-h-0 w-full rounded-[inherit] bg-transparent px-3 text-sm leading-5 font-normal text-[hsla(0,0%,9%,1)] font-sans dark:text-foreground",
  geistFieldTransitionClassName,
  "placeholder:text-[#777777] placeholder:font-normal placeholder:leading-5 dark:placeholder:text-muted-foreground",
  "disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:opacity-50 dark:disabled:bg-muted",
  "selection:bg-primary selection:text-primary-foreground",
);

export const geistSelectTriggerClassName = cn(
  "flex h-11 w-full items-center justify-between gap-2 rounded-md bg-white px-3 text-sm leading-5 font-normal text-[hsla(0,0%,9%,1)] whitespace-nowrap font-sans dark:bg-card dark:text-foreground",
  geistFieldTransitionClassName,
  geistShadowBorderClassName,
  geistShadowBorderHoverClassName,
  geistShadowBorderFocusClassName,
  "data-[placeholder]:text-[#777777] disabled:cursor-not-allowed disabled:opacity-50 dark:data-[placeholder]:text-muted-foreground",
  "aria-invalid:shadow-[0_0_0_1px_hsl(var(--destructive))] aria-invalid:focus-visible:shadow-[0_0_0_1px_hsl(var(--destructive)),0px_0px_0px_2px_hsl(var(--destructive)/0.15)]",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-[#666666] dark:[&_svg:not([class*='text-'])]:text-muted-foreground",
);

export const geistOutlinedControlClassName = cn(
  geistFieldTransitionClassName,
  geistShadowBorderClassName,
  geistShadowBorderHoverClassName,
  geistShadowBorderFocusClassName,
);

type GeistInputProps = React.ComponentProps<"input"> & {
  wrapperClassName?: string;
};

function GeistInput({ className, wrapperClassName, ...props }: GeistInputProps) {
  return (
    <div className={cn(geistInputWrapperClassName, wrapperClassName)} data-geist-input-wrapper="">
      <input className={cn(geistInputClassName, className)} data-geist-input="" {...props} />
    </div>
  );
}

type GeistInlineFieldProps = {
  children: React.ReactNode;
  className?: string;
};

function GeistInlineField({ children, className }: GeistInlineFieldProps) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>;
}

export { GeistInlineField, GeistInput };
