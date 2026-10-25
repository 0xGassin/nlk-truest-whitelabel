export function StackedCardsIllustration() {
  return (
    <div aria-hidden="true" className="flex h-36 w-[19.5rem] items-center justify-center">
      <div
        className="relative h-24 w-52 scale-150"
        style={{
          maskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
        }}
      >
        <div className="absolute inset-x-6 top-0 h-6 rounded-t-lg border border-border/50 bg-muted/60 dark:bg-muted/30" />
        <div className="absolute inset-x-3 top-3 h-6 rounded-t-lg border border-border/60 bg-muted/80 dark:bg-muted/50" />
        <div className="absolute inset-x-0 top-6 flex h-16 items-center gap-3 rounded-lg border border-border bg-background px-4 shadow-sm">
          <div className="size-8 shrink-0 rounded bg-muted" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-2.5 w-3/4 rounded bg-muted" />
            <div className="h-2 w-1/2 rounded bg-muted/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
