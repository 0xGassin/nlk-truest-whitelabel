import type { LucideIcon } from "lucide-react";

import { ChevronLeft, Cloud, ExternalLink, Eye, EyeOff, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dataTableToolbarButtonClassName } from "@/components/ui/data-table";
import { DrawerClose, DrawerDescription, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export type IssueDrawerTabId = "affected" | "autofix" | "notes" | "overview";

// eslint-disable-next-line react-refresh/only-export-components
export const ISSUE_DRAWER_BODY_CLASS = "flex-1 min-h-0 overflow-y-auto px-6 py-8";
// eslint-disable-next-line react-refresh/only-export-components
export const ISSUE_DRAWER_SECTIONS_CLASS = "space-y-8";
// eslint-disable-next-line react-refresh/only-export-components
export const ISSUE_DRAWER_SECTION_CLASS = "space-y-3";

export function IssueDrawerSectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground">{children}</h3>;
}

export function IssueDrawerTabCountBadge({ active, className, count }: { active: boolean; className?: string; count: number }) {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[11px] leading-none font-medium tabular-nums",
        active ? "bg-background text-foreground" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {count}
    </span>
  );
}

export function IssueDrawerTabs<T extends string>({
  activeTab,
  className,
  onTabChange,
  tabs,
}: {
  activeTab: T;
  className?: string;
  onTabChange: (tab: T) => void;
  tabs: { count?: number; icon: LucideIcon; id: T; label: string }[];
}) {
  return (
    <div className={cn("shrink-0 border-b px-6", className)}>
      <div className="-mb-px flex items-center gap-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              className={cn(
                "inline-flex items-center border-b-2 px-1 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
              )}
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id);
              }}
              type="button"
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 ? (
                <IssueDrawerTabCountBadge active={isActive} className="ml-1.5 mr-1" count={tab.count} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function IssueDrawerEvidence({
  description,
  label,
  value,
}: {
  description?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span className="min-w-0 truncate font-mono text-xs text-foreground" title={value}>
          {value}
        </span>
      </div>
      {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function IssueDrawerDetailItem({
  className,
  icon: Icon,
  label,
}: {
  className?: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-foreground", className)}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span>{label}</span>
    </div>
  );
}

export function IssueDrawerCodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <pre className="overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
        {children}
      </pre>
    </div>
  );
}

export function IssueDrawerHeaderMeta({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ISSUE_DRAWER_HEADER_CLASS = "shrink-0 border-0 px-6 pb-0 pt-5 text-left";

export function IssueDrawerHeaderShell({ children }: { children: React.ReactNode }) {
  return <div className={ISSUE_DRAWER_HEADER_CLASS}>{children}</div>;
}

export function IssueDrawerHeaderSection({ children }: { children: React.ReactNode }) {
  return <div className={ISSUE_DRAWER_HEADER_CLASS}>{children}</div>;
}

export function IssueDrawerHeaderBadges({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 flex flex-wrap items-center gap-2">{children}</div>;
}

export function IssueDrawerTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <DrawerTitle className={cn("text-xl leading-normal font-semibold tracking-tight", className)}>{children}</DrawerTitle>;
}

export function IssueDrawerSubtitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DrawerDescription className={cn("mt-1 text-sm leading-relaxed text-muted-foreground", className)}>
      {children}
    </DrawerDescription>
  );
}

export function IssueDrawerHeaderActions({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 items-center gap-1">{children}</div>;
}

export function IssueDrawerHeaderMain({
  actions,
  description,
  title,
}: {
  actions?: React.ReactNode;
  description?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <IssueDrawerTitle>{title}</IssueDrawerTitle>
        {description}
      </div>
      {actions ? <IssueDrawerHeaderActions>{actions}</IssueDrawerHeaderActions> : null}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const issueDrawerGhostIconButtonClass =
  "h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground";

// eslint-disable-next-line react-refresh/only-export-components
export const issueDrawerBrainIconButtonClass =
  "h-8 w-8 shrink-0 rounded-full text-primary hover:bg-primary/10 hover:text-primary";

// eslint-disable-next-line react-refresh/only-export-components
export const issueDrawerBrainDisabledIconButtonClass = "h-8 w-8 shrink-0 cursor-not-allowed text-muted-foreground/30";

export function IssueDrawerExternalLinkButton({ onClick }: { onClick: () => void }) {
  return (
    <Button className={issueDrawerGhostIconButtonClass} onClick={onClick} size="icon" variant="ghost">
      <ExternalLink className="size-5" />
    </Button>
  );
}

export function IssueDrawerIgnoreButton({
  ignoreLabel = "Ignore",
  isIgnored,
  onClick,
  restoreLabel = "Restore",
}: {
  ignoreLabel?: string;
  isIgnored: boolean;
  onClick: () => Promise<void> | void;
  restoreLabel?: string;
}) {
  return (
    <Button
      className={cn("gap-1.5", isIgnored && "bg-primary text-primary-foreground hover:bg-primary/90")}
      onClick={() => {
        void onClick();
      }}
      size="sm"
      variant={isIgnored ? "default" : "outline"}
    >
      {isIgnored ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      {isIgnored ? restoreLabel : ignoreLabel}
    </Button>
  );
}

export function IssueDrawerAffectedResourcesTable({
  onCopy,
  resources,
}: {
  onCopy: (resource: string) => void;
  resources: string[];
}) {
  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-[1fr_80px] border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
        <div>Resource ARN</div>
        <div className="text-right">Actions</div>
      </div>
      {resources.map((resource, i) => (
        <div
          className={cn(
            "group grid grid-cols-[1fr_80px] items-center bg-card text-sm font-normal text-foreground transition-colors hover:bg-accent/50",
            i < resources.length - 1 ? "border-b border-border/50" : "",
          )}
          key={resource}
        >
          <div className="flex h-16 items-center overflow-hidden px-4 pr-4">
            <span className="truncate text-sm" title={resource}>
              {resource}
            </span>
          </div>
          <div className="relative flex justify-end px-4">
            <Button
              className="absolute top-1/2 right-4 h-7 -translate-y-1/2 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => {
                onCopy(resource);
              }}
              size="sm"
              variant="outline"
            >
              Copy ARN
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const issueDrawerCloseButtonClass = cn(dataTableToolbarButtonClassName, "text-muted-foreground");

// eslint-disable-next-line react-refresh/only-export-components
export const ISSUE_DRAWER_FOOTER_CLASS = "shrink-0 flex-row items-center justify-between gap-4 border-t border-[#eaeaea] bg-[#fafafa] py-3 dark:border-border dark:bg-card";

export function IssueDrawerCloseButton({ label = "Close" }: { label?: string }) {
  return (
    <DrawerClose asChild>
      <Button className={issueDrawerCloseButtonClass} size="sm" variant="outline">
        {label}
      </Button>
    </DrawerClose>
  );
}

export function IssueDrawerBackButton({ label = "Back", onClick }: { label?: string; onClick: () => void }) {
  return (
    <Button className={issueDrawerCloseButtonClass} onClick={onClick} size="sm" variant="outline">
      <ChevronLeft className="mr-1 size-4" />
      {label}
    </Button>
  );
}

export function IssueDrawerFooter({
  backLabel,
  children,
  closeLabel,
  onBack,
}: {
  backLabel?: string;
  children?: React.ReactNode;
  closeLabel?: string;
  onBack?: () => void;
}) {
  return (
    <DrawerFooter className={ISSUE_DRAWER_FOOTER_CLASS}>
      {onBack ? (
        <IssueDrawerBackButton label={backLabel} onClick={onBack} />
      ) : (
        <IssueDrawerCloseButton label={closeLabel} />
      )}
      {children}
    </DrawerFooter>
  );
}

export function IssueDrawerAffectedFilesTable({
  files,
  onCopy,
  onFileClick,
}: {
  files: string[];
  onCopy: (file: string) => void;
  onFileClick?: (file: string) => void;
}) {
  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-[1fr_80px] border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
        <div>File</div>
        <div className="text-right">Actions</div>
      </div>
      {files.map((file, i) => (
        <div
          className={cn(
            "group grid grid-cols-[1fr_80px] items-center bg-card text-sm font-normal text-foreground transition-colors hover:bg-accent/50",
            i < files.length - 1 ? "border-b border-border/50" : "",
            onFileClick && "cursor-pointer",
          )}
          key={file}
          onClick={
            onFileClick
              ? () => {
                  onFileClick(file);
                }
              : undefined
          }
          onKeyDown={
            onFileClick
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onFileClick(file);
                  }
                }
              : undefined
          }
          role={onFileClick ? "button" : undefined}
          tabIndex={onFileClick ? 0 : undefined}
        >
          <div className="flex h-16 items-center overflow-hidden px-4 pr-4">
            <span className="truncate text-sm" title={file}>
              {file}
            </span>
          </div>
          <div className="relative flex justify-end px-4">
            <Button
              className="absolute top-1/2 right-4 h-7 -translate-y-1/2 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onCopy(file);
              }}
              size="sm"
              variant="outline"
            >
              Copy
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
