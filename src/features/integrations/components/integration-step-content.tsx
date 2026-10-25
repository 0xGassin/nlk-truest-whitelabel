"use client";

import type { ReactNode } from "react";

import { ArrowUpRight, ChevronLeft, ChevronRight, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dialogPrimaryButtonClassName } from "@/components/ui/dialog-panel";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { integrationHelperTextClassName } from "./integration-dialog-shell";

const linkActionClassName =
  "group flex w-full items-center gap-3.5 rounded-lg border border-[#eaeaea] bg-white px-4 py-3.5 text-left transition-all hover:border-[#d4d4d4] hover:bg-[#fafafa] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#eaeaea] disabled:hover:bg-white dark:border-border dark:bg-card dark:hover:border-border dark:hover:bg-muted/40 dark:disabled:hover:border-border dark:disabled:hover:bg-card dark:disabled:hover:shadow-none";

export function IntegrationStepBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}

export function IntegrationStepIntro({ children }: { children: ReactNode }) {
  return <p className={cn(integrationHelperTextClassName, "leading-relaxed")}>{children}</p>;
}

interface IntegrationInstructionItem {
  content?: ReactNode;
  description?: ReactNode;
  title: string;
}

export function IntegrationStepInstructions({ steps }: { steps: IntegrationInstructionItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#eaeaea] dark:border-border">
      {steps.map((step, index) => (
        <div
          className={cn("px-4 py-3.5", index > 0 && "border-t border-[#eaeaea] dark:border-border")}
          key={step.title}
        >
          <div className="flex gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[11px] font-medium text-[#666666] dark:bg-muted dark:text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              {step.description ? (
                <p className={cn(integrationHelperTextClassName, "text-[13px] leading-relaxed")}>{step.description}</p>
              ) : null}
              {step.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function IntegrationStepNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-blue-500/20 bg-blue-500/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-blue-700 dark:text-blue-300">
      <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
      <span>{children}</span>
    </div>
  );
}

export function IntegrationStepFields({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function IntegrationStepFieldHint({ children }: { children: ReactNode }) {
  return <p className={cn(integrationHelperTextClassName, "text-xs")}>{children}</p>;
}

interface IntegrationStepActionRowProps {
  onBack?: () => void;
  primary: ReactNode;
  showBack?: boolean;
}

export function IntegrationStepActionRow({
  onBack,
  primary,
  showBack = Boolean(onBack),
}: IntegrationStepActionRowProps) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      {showBack && onBack ? (
        <Button
          className="h-8 px-2 text-[#666666] hover:text-foreground dark:text-muted-foreground"
          onClick={onBack}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ChevronLeft className="mr-1 size-4" />
          Back
        </Button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">{primary}</div>
    </div>
  );
}

interface IntegrationStepExternalActionRowProps {
  continueDisabled?: boolean;
  continueReady?: boolean;
  isOpened: boolean;
  isOpening?: boolean;
  onBack?: () => void;
  onContinue: () => void;
  onOpen: () => void;
  openAgainLabel?: string;
  openLabel?: string;
  showBack?: boolean;
}

export function IntegrationStepExternalActionRow({
  continueDisabled,
  continueReady,
  isOpened,
  isOpening = false,
  onBack,
  onContinue,
  onOpen,
  openAgainLabel = "Open again",
  openLabel = "Open",
  showBack = Boolean(onBack),
}: IntegrationStepExternalActionRowProps) {
  const canContinue = continueReady ?? isOpened;
  const isContinueDisabled = continueDisabled ?? !canContinue;

  return (
    <IntegrationStepActionRow
      onBack={onBack}
      showBack={showBack}
      primary={
        <div className="flex items-center gap-2">
          {isOpened ? (
            <Button disabled={isOpening} onClick={onOpen} type="button" variant="outline">
              {isOpening ? <Spinner className="mr-2" /> : null}
              {openAgainLabel}
            </Button>
          ) : (
            <Button className={dialogPrimaryButtonClassName} disabled={isOpening} onClick={onOpen} type="button">
              {isOpening ? <Spinner className="mr-2" /> : null}
              {openLabel}
            </Button>
          )}
          <Button
            className={canContinue && !isContinueDisabled ? dialogPrimaryButtonClassName : undefined}
            disabled={isContinueDisabled}
            onClick={onContinue}
            type="button"
            variant={canContinue && !isContinueDisabled ? "default" : "outline"}
          >
            Continue
            <ChevronRight className="ml-2 size-4" />
          </Button>
        </div>
      }
    />
  );
}

interface IntegrationStepLinkActionProps {
  description: string;
  disabled?: boolean;
  href?: string;
  icon?: ReactNode;
  isLoading?: boolean;
  onClick?: () => void;
  title: string;
}

function IntegrationStepLinkActionContent({
  description,
  icon,
  isLoading,
  title,
}: Pick<IntegrationStepLinkActionProps, "description" | "icon" | "isLoading" | "title">) {
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[#666666] ring-1 ring-inset ring-[#eaeaea] transition-colors group-hover:bg-white dark:bg-muted dark:text-muted-foreground dark:ring-border dark:group-hover:bg-accent">
        {isLoading ? <Spinner className="size-4" /> : (icon ?? <ArrowUpRight className="size-4" />)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className={cn(integrationHelperTextClassName, "mt-0.5 block text-xs")}>{description}</span>
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#eaeaea] bg-[#fafafa] text-[#666666] transition-all group-hover:border-[#cccccc] group-hover:bg-white group-hover:text-foreground dark:border-border dark:bg-muted/40 dark:text-muted-foreground dark:group-hover:border-border dark:group-hover:bg-accent dark:group-hover:text-foreground">
        <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
      </span>
    </>
  );
}

export function IntegrationStepLinkAction({
  description,
  disabled,
  href,
  icon,
  isLoading = false,
  onClick,
  title,
}: IntegrationStepLinkActionProps) {
  if (href) {
    return (
      <a className={linkActionClassName} href={href} rel="noopener noreferrer" target="_blank">
        <IntegrationStepLinkActionContent description={description} icon={icon} isLoading={isLoading} title={title} />
      </a>
    );
  }

  return (
    <button className={linkActionClassName} disabled={disabled || isLoading} onClick={onClick} type="button">
      <IntegrationStepLinkActionContent description={description} icon={icon} isLoading={isLoading} title={title} />
    </button>
  );
}

export function IntegrationStepLinkActions({ children }: { children: ReactNode }) {
  return <div className="space-y-2.5">{children}</div>;
}

interface IntegrationStepInlineLinkProps {
  href: string;
  title: string;
}

export function IntegrationStepInlineLink({ href, title }: IntegrationStepInlineLinkProps) {
  return (
    <a
      className="inline-flex items-center gap-1.5 rounded-md border border-[#eaeaea] bg-white px-2.5 py-1.5 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-[#cccccc] hover:bg-[#fafafa] dark:border-border dark:bg-card dark:hover:border-border dark:hover:bg-accent"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {title}
      <ArrowUpRight className="size-3 text-[#666666] dark:text-muted-foreground" />
    </a>
  );
}

interface IntegrationStepUploadZoneProps {
  accept?: string;
  description: string;
  icon: ReactNode;
  id: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  title: string;
}

export function IntegrationStepUploadZone({
  accept = ".json,application/json",
  description,
  icon,
  id,
  onChange,
  title,
}: IntegrationStepUploadZoneProps) {
  return (
    <div className="rounded-lg border border-dashed border-[#d4d4d4] bg-[#fafafa] px-4 py-8 text-center transition-colors hover:border-[#cccccc] hover:bg-white dark:border-border dark:bg-muted/40 dark:hover:border-border dark:hover:bg-accent">
      <input accept={accept} className="hidden" id={id} onChange={onChange} type="file" />
      <label className="cursor-pointer" htmlFor={id}>
        <div className="flex flex-col items-center gap-2.5">
          <span className="text-[#666666] dark:text-muted-foreground">{icon}</span>
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className={cn(integrationHelperTextClassName, "mt-0.5 text-xs")}>{description}</p>
          </div>
        </div>
      </label>
    </div>
  );
}

interface IntegrationStepKeyValueProps {
  items: Array<{ label: string; value: string }>;
}

export function IntegrationStepKeyValue({ items }: IntegrationStepKeyValueProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#eaeaea] dark:border-border">
      {items.map((item, index) => (
        <div
          className={cn(
            "flex items-center justify-between gap-4 px-4 py-2.5 text-sm",
            index > 0 && "border-t border-[#eaeaea] dark:border-border",
          )}
          key={item.label}
        >
          <span className="text-[#666666] dark:text-muted-foreground">{item.label}</span>
          <span className="truncate font-medium text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
