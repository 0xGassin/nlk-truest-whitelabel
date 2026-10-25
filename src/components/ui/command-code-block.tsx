"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface CommandCodeBlockProps {
  className?: string;
  command: string;
  onCopy?: (command: string) => void;
}

export function CommandCodeBlock({ className, command, onCopy }: CommandCodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    onCopy?.(command);

    globalThis.setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  return (
    <div className={cn("group relative overflow-hidden rounded-lg border border-[#eaeaea] bg-[#fafafa] dark:border-border dark:bg-card", className)}>
      <button
        aria-label="Copy command"
        className={cn(
          "pointer-events-none invisible absolute top-2 right-2 z-10 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-[#eaeaea] bg-white px-2.5 text-[12px] font-normal text-[#666666] transition-colors hover:border-[#cccccc] hover:text-foreground group-hover:visible group-hover:pointer-events-auto focus-visible:visible focus-visible:pointer-events-auto dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:border-white/20",
        )}
        onClick={() => {
          void handleCopy();
        }}
        type="button"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>

      <pre className="max-h-36 overflow-x-auto overflow-y-auto px-3.5 py-3 font-mono text-[13px] leading-[1.65] break-all whitespace-pre-wrap text-[hsl(0,0%,20%)] dark:text-foreground/90">
        <code>{command}</code>
      </pre>
    </div>
  );
}
