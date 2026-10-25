import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading dashboard"
      className="flex size-full min-h-0 min-w-0 flex-col gap-4 overflow-auto bg-background px-2 py-4 font-sans text-[14px]"
      role="status"
    >
      <div className="flex shrink-0 justify-end">
        <Skeleton aria-hidden="true" className="h-8 w-[min(260px,55vw)] rounded-md" />
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton aria-hidden="true" className="h-[104px] rounded-lg" key={index} />
        ))}
      </div>
      <div className="grid min-w-0 min-h-0 gap-3 xl:grid-cols-[minmax(0,2.15fr)_minmax(280px,0.85fr)]">
        <Skeleton aria-hidden="true" className="min-h-[390px] rounded-lg" />
        <Skeleton aria-hidden="true" className="min-h-[390px] rounded-lg" />
      </div>
      <Skeleton aria-hidden="true" className="min-h-[250px] rounded-lg" />
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}
