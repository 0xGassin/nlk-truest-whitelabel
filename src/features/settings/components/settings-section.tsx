import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  descriptionClassName?: string;
  footer?: ReactNode;
  footerClassName?: string;
  footerHint?: string;
  title: string;
  titleClassName?: string;
}

export function SettingsSection({
  badge,
  children,
  className,
  description,
  descriptionClassName,
  footer,
  footerClassName,
  footerHint,
  title,
  titleClassName,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border/80 bg-card ring-1 ring-border/10 ring-inset",
        className,
      )}
    >
      <div className="p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className={cn("text-xl font-semibold text-foreground", titleClassName)}>{title}</h3>
          {badge}
        </div>
        {description ? (
          <p className={cn("mb-5 text-sm text-foreground/80", descriptionClassName)}>{description}</p>
        ) : null}
        {children}
      </div>
      {footer || footerHint ? (
        <div
          className={cn(
            "flex flex-col gap-3 border-t border-border/80 px-6 py-3 sm:flex-row sm:items-center sm:justify-between",
            footerClassName,
          )}
        >
          {footerHint ? <p className="text-sm text-muted-foreground">{footerHint}</p> : <span />}
          {footer ? <div className="flex shrink-0 items-center gap-2 sm:ml-auto">{footer}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

export function SettingsPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
      <div className="flex w-full flex-1 flex-col px-12 py-6 sm:px-56 sm:py-8">
        <div className="flex min-h-0 flex-1 flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
