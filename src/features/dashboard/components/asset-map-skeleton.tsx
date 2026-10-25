import { Skeleton } from "@/components/ui/skeleton";

export function AssetMapSkeleton({ fullPage = false }: { fullPage?: boolean }) {
  if (fullPage) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading dashboard"
        className="flex size-full min-h-0 flex-col gap-4 overflow-hidden bg-transparent p-4"
        role="status"
      >
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
          <div className="grid min-h-0 grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton aria-hidden="true" className="min-h-40 rounded-lg" />
            <Skeleton aria-hidden="true" className="min-h-40 rounded-lg" />
            <Skeleton aria-hidden="true" className="min-h-40 rounded-lg" />
          </div>
          <Skeleton aria-hidden="true" className="min-h-0 rounded-lg" />
        </div>
        <span className="sr-only">Loading dashboard</span>
      </div>
    );
  }

  return (
    <div
      aria-busy="true"
      aria-label="Loading asset map"
      className="flex min-h-0 flex-1 items-center justify-center bg-transparent p-1"
      role="status"
    >
      <Skeleton aria-hidden="true" className="size-full rounded-lg" />
      <span className="sr-only">Loading asset map</span>
    </div>
  );
}
