"use client";

import { ChevronDownIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { collapsePanel, mono, SwapLabel } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

export interface ReasoningStep {
  body: string;
  title: string;
}

export interface ReasoningPanelProps {
  className?: string;
  elapsed?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  restingLabel: string;
  steps: ReasoningStep[];
  streaming: boolean;
  visibleSteps: number;
}

export function ReasoningPanel({
  className,
  elapsed,
  onOpenChange,
  open,
  restingLabel,
  steps,
  streaming,
  visibleSteps,
}: ReasoningPanelProps) {
  return (
    <Collapsible
      className={cn("w-full max-w-sm", className)}
      onOpenChange={onOpenChange}
      open={open}
    >
      <CollapsibleTrigger className="group/trigger flex items-center gap-1.5 py-1 text-[13.5px] text-foreground/55 transition-[color,scale] outline-none hover:text-foreground/90 active:scale-[0.98]">
        <SwapLabel active={streaming ? 0 : 1} className="text-start">
          <>
            <span className="relative inline-block leading-none">
              <span>Thinking</span>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 shimmer motion-reduce:animate-none"
              >
                Thinking
              </span>
            </span>
            {elapsed !== undefined && (
              <span className={cn(mono, "text-foreground/30 tabular-nums")}>
                {elapsed}
              </span>
            )}
          </>
          <>{restingLabel}</>
        </SwapLabel>
        <ChevronDownIcon className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-open/trigger:rotate-180 group-data-panel-open/trigger:rotate-180 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(collapsePanel, "outline-none")}>
        <ol className="flex flex-col gap-4 pt-3 pb-1">
          {steps.slice(0, visibleSteps).map((step, i) => {
            const active = streaming && i === visibleSteps - 1;
            return (
              <li
                className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both flex gap-3 duration-300"
                key={step.title}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-[7px] size-[5px] shrink-0 rounded-full transition-colors duration-300",
                    active
                      ? "animate-pulse bg-blue-500 dark:bg-blue-400"
                      : "bg-foreground/20",
                  )}
                />
                <span className="flex flex-col">
                  <p className="text-[13.5px] font-medium text-foreground/90">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/50">
                    {step.body}
                  </p>
                </span>
              </li>
            );
          })}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
