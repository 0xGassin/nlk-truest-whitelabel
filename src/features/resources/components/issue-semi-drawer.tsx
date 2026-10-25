import type { Issue } from "@/services/api/feed";

import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { detailDrawerSurfaceClassName, Drawer, DrawerClose, DrawerContent } from "@/components/ui/drawer";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast/toast";
import {
  IssueDrawerHeaderSection,
  IssueDrawerSectionHeading,
  IssueDrawerTitle,
} from "@/features/issues/components/issue-drawer-ui";
import { cn } from "@/lib/utils";

const markdownComponents = {
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ol>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-sm leading-relaxed text-muted-foreground last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <span className="font-normal text-inherit">{children}</span>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ul>
  ),
};

interface IssueSemiDrawerProps {
  issue: Issue | null;
  onClose: () => void;
}

export function IssueSemiDrawer({ issue, onClose }: IssueSemiDrawerProps) {
  return (
    <Drawer
      direction="bottom"
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={!!issue}
    >
      <DrawerContent
        className={cn(
          detailDrawerSurfaceClassName,
          "ml-auto w-full max-w-[50%] p-0 shadow-[0_-6px_16px_-10px_rgba(0,0,0,0.08)] outline-none dark:shadow-[0_-6px_16px_-10px_rgba(0,0,0,0.22)]",
        )}
        hideOverlay
        side="bottom"
      >
        {issue ? (
          <div className="flex h-[50dvh] flex-col overflow-hidden">
            <IssueDrawerHeaderSection>
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <IssueDrawerTitle className="truncate">{issue.title ?? issue.name}</IssueDrawerTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <SeverityBadge severity={issue.severity} />
                    <span>{issue.source}</span>
                    <StatusBadge label={issue.status_label} status={issue.status} />
                  </div>
                </div>
                <DrawerClose asChild>
                  <Button className="size-8" size="icon" variant="ghost">
                    <X className="size-4" />
                  </Button>
                </DrawerClose>
              </div>
            </IssueDrawerHeaderSection>

            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4">
              {issue.description ? (
                <section className="space-y-3">
                  <IssueDrawerSectionHeading>Description</IssueDrawerSectionHeading>
                  <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                    {issue.description}
                  </ReactMarkdown>
                </section>
              ) : null}

              <section className="grid grid-cols-3 gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="text-sm text-muted-foreground">Location</div>
                  <button
                    className="block w-full min-w-0 truncate text-left text-sm text-foreground underline-offset-2 hover:underline"
                    onClick={() => {
                      void navigator.clipboard.writeText(issue.location);
                      toast.success("Copied", { description: "Location copied to clipboard" });
                    }}
                    type="button"
                  >
                    {issue.location}
                  </button>
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-sm text-muted-foreground">Rule</div>
                  <div className="min-w-0 truncate text-sm text-foreground">{issue.name}</div>
                </div>
                {issue.cvss ? (
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm text-muted-foreground">CVSS</div>
                    <div className="min-w-0 truncate text-sm text-foreground">{issue.cvss.toFixed(1)}</div>
                  </div>
                ) : null}
                {issue.created_at ? (
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm text-muted-foreground">Date found</div>
                    <div className="min-w-0 truncate text-sm text-foreground">
                      {new Date(issue.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ) : null}
              </section>

              {issue.remediation ? (
                <section className="space-y-3">
                  <IssueDrawerSectionHeading>Remediation</IssueDrawerSectionHeading>
                  <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                    {issue.remediation}
                  </ReactMarkdown>
                </section>
              ) : null}
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
