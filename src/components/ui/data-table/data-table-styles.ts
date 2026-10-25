export const dataTablePrimaryTextClass = "truncate text-sm font-medium leading-5 text-foreground";
export const dataTableSecondaryTextClass = "text-[13px] font-normal text-foreground/80";
export const dataTableSecondaryInlineClass = `inline-flex max-w-full items-center gap-1.5 ${dataTableSecondaryTextClass}`;

/** Shared toolbar styling for outline buttons (refresh, filters, etc.). */
export const dataTableToolbarButtonClassName =
  "!bg-white hover:!bg-[#fafafa] focus-visible:!bg-white active:!bg-white dark:!bg-transparent dark:hover:!bg-accent dark:focus-visible:!bg-accent";

/** Shared toolbar styling for search inputs — applied to the input wrapper where the border renders. */
export const dataTableToolbarInputClassName = "!bg-white dark:!bg-transparent text-[14px] text-gray-900/50 dark:text-foreground/50";
