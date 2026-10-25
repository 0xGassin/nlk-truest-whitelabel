"use client";

import { DitherLoader } from "@/components/ui/dither-loader";
import { cn } from "@/lib/utils";

interface UniversalLoaderProps {
  className?: string;
  message?: string;
}

export function UniversalLoader({ className, message }: UniversalLoaderProps) {
  return (
    <div
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 inline-flex size-20 shrink-0 items-center justify-center overflow-hidden motion-safe:duration-300",
        className,
      )}
    >
      <DitherLoader message={message} size="default" />
    </div>
  );
}
