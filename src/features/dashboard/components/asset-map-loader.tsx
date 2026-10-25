import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function AssetMapLoader({ className, label = "Loading asset map" }: { className?: string; label?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={cn("flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-transparent p-6", className)}
      role="status"
    >
      <Skeleton aria-hidden="true" className="skeleton-loading size-40 rounded-xl" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
