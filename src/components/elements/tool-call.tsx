"use client";

import { CheckIcon, ChevronRightIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { collapsePanel, field, mono, SwapLabel } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

export interface ToolCallProps {
  activeLabel: string;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  label: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  query: string;
  request?: string;
  result?: React.ReactNode;
  running: boolean;
}

export function ToolCall({
  activeLabel,
  children,
  className,
  icon,
  label,
  onOpenChange,
  open,
  query,
  request,
  result,
  running,
}: ToolCallProps) {
  return (
    <Collapsible
      className={cn("w-full max-w-sm", className)}
      onOpenChange={onOpenChange}
      open={open}
    >
      <CollapsibleTrigger className="group/trigger flex items-center gap-2 rounded-md py-1 text-[13.5px] text-foreground/55 transition-colors outline-none hover:text-foreground/90">
        <ChevronRightIcon className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-open/trigger:rotate-90 group-data-panel-open/trigger:rotate-90 motion-reduce:transition-none" />
        {icon && <span className="flex shrink-0 items-center">{icon}</span>}
        <SwapLabel active={running ? 0 : 1} className="text-start">
          <span className="relative inline-block leading-none">
            <span>{activeLabel}</span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 shimmer motion-reduce:animate-none"
            >
              {activeLabel}
            </span>
          </span>
          <>{label}</>
        </SwapLabel>
        <span
          className={cn(
            mono,
            "rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-foreground/70",
          )}
        >
          {query}
        </span>
        <span className="ms-auto flex w-4 items-center justify-end">
          {!running && (
            <CheckIcon className="fade-in zoom-in-90 animate-in size-3.5 text-emerald-500 duration-200" />
          )}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(collapsePanel, "outline-none")}>
        {children === undefined ? (
          <>
            {typeof result === "string" ? (
              <div className={cn(field, "mt-2 overflow-hidden rounded-2xl text-xs")}>
                {request !== undefined && (
                  <>
                    <div className="px-3.5 pt-2.5 pb-2">
                      <p className={cn(mono, "mb-1 text-foreground/35")}>Request</p>
                      <p className="font-mono text-foreground/55">{request}</p>
                    </div>
                    <div className="mx-3.5 h-px bg-foreground/[0.06]" />
                  </>
                )}
                <div className="px-3.5 pt-2 pb-2.5">
                  <p className={cn(mono, "mb-1 text-foreground/35")}>Result</p>
                  <p className="text-foreground/90">{result}</p>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <p className={cn(mono, "mb-1 px-1 text-foreground/35")}>Result</p>
                {result}
              </div>
            )}
          </>
        ) : (
          <div className="mt-2">{children}</div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
