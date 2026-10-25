"use client";

import { ArrowUpIcon } from "lucide-react";

import { inkButton, paper } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/** Deterministic per-chip jitter so the suggestions look casually scattered. */
const SCATTER = [
  { marginLeft: 12, marginTop: 4, rotate: -1.6 },
  { marginLeft: -16, marginTop: -8, rotate: 1.3 },
  { marginLeft: 18, marginTop: -4, rotate: -1.1 },
  { marginLeft: -12, marginTop: 10, rotate: 1.9 },
  { marginLeft: 14, marginTop: -10, rotate: -1.5 },
  { marginLeft: -18, marginTop: 6, rotate: 1.7 },
];

export interface EmptyStateProps {
  className?: string;
  greeting: string;
  hideComposer?: boolean;
  onSuggestion?: (suggestion: string) => void;
  suggestions: readonly string[];
}

export function EmptyState({
  className,
  greeting,
  hideComposer = false,
  onSuggestion,
  suggestions,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col items-center gap-7",
        className,
      )}
    >
      <h2
        className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-center text-2xl font-medium tracking-tight duration-500 motion-reduce:animate-none"
        style={{
          animationDuration: "700ms",
          animationTimingFunction: "cubic-bezier(0.33, 1, 0.68, 1)",
        }}
      >
        {greeting}
      </h2>

      <div className="grid w-full grid-cols-1 items-start gap-2 min-[430px]:grid-cols-2">
        {suggestions.map((suggestion, i) => {
          const jitter = SCATTER[i % SCATTER.length] ?? SCATTER[0];
          return (
            <button
              className={cn(
                paper,
                "fade-in slide-in-from-bottom-2 animate-in fill-mode-both rounded-xl px-4 py-2.5 text-center text-[13px] leading-snug transition-transform duration-500 outline-none hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-foreground/20 active:scale-[0.97] motion-reduce:animate-none",
              )}
              key={suggestion}
              onClick={() => {
                onSuggestion?.(suggestion);
              }}
              style={{
                animationDelay: `${String(120 + i * 70)}ms`,
                animationDuration: "700ms",
                animationTimingFunction: "cubic-bezier(0.33, 1, 0.68, 1)",
                marginLeft: jitter.marginLeft,
                marginTop: jitter.marginTop,
                rotate: `${String(jitter.rotate)}deg`,
              }}
              type="button"
            >
              {suggestion}
            </button>
          );
        })}
      </div>

      {!hideComposer && (
        <div
          className={cn(
            paper,
            "fade-in slide-in-from-bottom-2 animate-in fill-mode-both flex h-13 w-full items-center justify-between rounded-full py-2 ps-5 pe-2.5 duration-500 motion-reduce:animate-none",
          )}
          style={{ animationDelay: "360ms", animationDuration: "700ms", animationTimingFunction: "cubic-bezier(0.33, 1, 0.68, 1)" }}
        >
          <span className="text-[15px] text-foreground/35">Ask anything</span>
          <span
            className={cn(
              inkButton,
              "flex size-8 items-center justify-center rounded-full",
            )}
          >
            <ArrowUpIcon className="size-4" />
          </span>
        </div>
      )}
    </div>
  );
}
