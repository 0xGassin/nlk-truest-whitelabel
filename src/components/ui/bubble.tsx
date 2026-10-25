"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Bubble({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-lg bg-muted px-3 py-2", className)} data-slot="bubble" {...props} />
  );
}

function BubbleContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm", className)} data-slot="bubble-content" {...props} />;
}

export { Bubble, BubbleContent };
