"use client";

import type { ReactNode } from "react";

import { XIcon } from "lucide-react";

import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ghostButton } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

import { integrationDialogContentClassName } from "./dialog-shell";

export const integrationPanelPaddingX = "px-3.5";

export const integrationHelperTextClassName =
  "text-sm font-normal leading-snug text-[#666666] clean:text-[#666666] soft:text-[#666666] dark:text-[#999999]";

export const integrationFooterClassName =
  "flex shrink-0 items-center justify-between gap-4 border-t border-[#eaeaea] bg-[#fafafa] py-3 dark:border-border dark:bg-card";

export const integrationCardClassName = "rounded-lg border border-[#eaeaea] bg-white dark:border-border dark:bg-card";

export const integrationMutedCardClassName =
  "rounded-lg border border-[#eaeaea] bg-[#fafafa] dark:border-border dark:bg-muted/40";

export interface IntegrationDialogInfo {
  description: string;
  icon: ReactNode;
  name: string;
}

interface IntegrationDialogShellProps {
  children: ReactNode;
  className?: string;
  closeButtonClassName?: string;
  footer?: ReactNode;
  footerHint?: ReactNode;
  integration?: IntegrationDialogInfo;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export function IntegrationDialogShell({
  children,
  className,
  closeButtonClassName,
  footer,
  footerHint,
  integration,
  onOpenChange,
  open,
  title,
}: IntegrationDialogShellProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={cn(integrationDialogContentClassName, className)} showCloseButton={false}>
        <div className="flex h-full min-h-0 flex-col bg-white dark:bg-card">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className={cn(integrationPanelPaddingX, "pt-4 pb-6")}>
              <DialogHeader className="mb-6 flex flex-row items-center justify-between space-y-0 text-left">
                <DialogTitle className="text-[17.5px] font-semibold tracking-[-0.4px] text-foreground">{title}</DialogTitle>
                <DialogClose
                  className={cn(
                    "shrink-0 rounded-xs text-foreground/70 transition-opacity hover:text-foreground focus:outline-hidden disabled:pointer-events-none",
                    closeButtonClassName && cn(ghostButton, "absolute top-3 right-3 z-10 size-7", closeButtonClassName),
                  )}
                >
                  <XIcon className="size-5" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </DialogHeader>

              {integration ? (
                <div className={cn(integrationCardClassName, "mb-6 flex items-center gap-3 px-4 py-3.5")}>
                  <div className="flex size-10 shrink-0 items-center justify-center">{integration.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{integration.name}</p>
                    <p className={cn(integrationHelperTextClassName, "text-[13px]")}>{integration.description}</p>
                  </div>
                </div>
              ) : null}

              {children}
            </div>
          </div>

          {footer || footerHint ? (
            <div className={cn(integrationFooterClassName, integrationPanelPaddingX)}>
              {footerHint ? (
                <p className={cn("min-w-0 truncate", integrationHelperTextClassName)}>{footerHint}</p>
              ) : (
                <span />
              )}
              {footer ? <div className="flex shrink-0 items-center gap-2">{footer}</div> : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
