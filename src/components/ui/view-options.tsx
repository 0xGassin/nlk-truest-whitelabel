"use client";

import type { ReactNode } from "react";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ViewOptionsProps {
  buttonClassName?: string;
  children: ReactNode;
}

export function ViewOptions({ buttonClassName, children }: ViewOptionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="View options" className={cn("size-9 shrink-0", buttonClassName)} size="icon" variant="outline">
          <SlidersHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
