"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface DataTableRefreshButtonProps {
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
  title?: string;
}

export function DataTableRefreshButton({
  className,
  disabled,
  isLoading,
  onClick,
  title = "Refresh",
}: DataTableRefreshButtonProps) {
  return (
    <Button
      aria-label={title}
      className={cn("size-9 shrink-0", className)}
      disabled={disabled ?? isLoading}
      onClick={onClick}
      size="icon"
      title={title}
      type="button"
      variant="outline"
    >
      {isLoading ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
    </Button>
  );
}
