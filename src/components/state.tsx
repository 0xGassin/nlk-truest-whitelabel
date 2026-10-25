import type { StateIcon, StateMessage, StateMessagePreset } from "@/components/state-messages";
import type { AriaRole, ReactNode } from "react";

import { AlertCircle } from "lucide-react";

import { GenericPageSkeleton } from "@/components/page-loading";
import { stateMessages } from "@/components/state-messages";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StateProps {
  ariaBusy?: boolean;
  ariaLive?: "assertive" | "off" | "polite";
  children: ReactNode;
  className?: string;
  fillPage?: boolean;
  role?: AriaRole;
}

function StateRoot({ ariaBusy, ariaLive, children, className, fillPage = true, role }: StateProps) {
  return (
    <div
      aria-busy={ariaBusy}
      aria-live={ariaLive}
      className={cn(
        "flex w-full items-center justify-center p-4 text-center",
        fillPage ? "h-full min-h-0 flex-1" : "min-h-[200px] flex-1",
        className,
      )}
      role={role}
    >
      {children}
    </div>
  );
}

interface StateContentProps {
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  icon?: StateIcon;
  iconClassName?: string;
  iconWrapperClassName?: string;
  title: ReactNode;
}

function StateContent({
  action,
  className,
  contentClassName,
  description,
  icon: Icon,
  iconClassName,
  iconWrapperClassName,
  title,
}: StateContentProps) {
  return (
    <div className={cn("flex max-w-2xl flex-col items-center gap-3", contentClassName, className)}>
      {Icon ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted/40 p-4 text-muted-foreground",
            iconWrapperClassName,
          )}
        >
          <Icon aria-hidden="true" className={cn("size-10 shrink-0", iconClassName)} />
        </div>
      ) : null}
      <div className="space-y-2">
        {title ? <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3> : null}
        {description ? (
          <p className="text-sm leading-relaxed text-balance text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export interface StateEmptyProps {
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  fillPage?: boolean;
  icon?: StateIcon;
  iconClassName?: string;
  preset?: StateMessagePreset;
  title?: ReactNode;
}

function StateEmpty({
  action,
  className,
  contentClassName,
  description,
  fillPage = true,
  icon,
  iconClassName,
  preset,
  title,
}: StateEmptyProps) {
  const presetContent: StateMessage | undefined = preset ? stateMessages[preset] : undefined;
  const resolvedTitle = title ?? presetContent?.title ?? stateMessages.noData.title;
  const resolvedDescription = description ?? presetContent?.description;
  const resolvedIcon = icon ?? presetContent?.icon ?? stateMessages.noData.icon;

  return (
    <StateRoot
      className={cn(
        "[&_button]:bg-white [&_button]:shadow-none [&_button:hover]:bg-[#fafafa] dark:[&_button]:bg-transparent dark:[&_button:hover]:bg-accent",
        className,
      )}
      fillPage={fillPage}
    >
      <StateContent
        action={action}
        contentClassName={contentClassName}
        description={resolvedDescription}
        icon={resolvedIcon}
        iconClassName={iconClassName}
        title={resolvedTitle}
      />
    </StateRoot>
  );
}

export interface StateErrorProps {
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  fillPage?: boolean;
  icon?: StateIcon;
  iconClassName?: string;
  isRetrying?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  title?: ReactNode;
}

function StateError({
  action,
  className,
  contentClassName,
  description,
  fillPage = true,
  icon,
  iconClassName,
  isRetrying = false,
  onRetry,
  retryLabel = "Retry",
  title,
}: StateErrorProps) {
  const resolvedAction =
    action ??
    (onRetry ? (
      <Button disabled={isRetrying} onClick={onRetry} variant="outline">
        {isRetrying ? "Retrying..." : retryLabel}
      </Button>
    ) : undefined);

  return (
    <StateRoot ariaLive="assertive" className={className} fillPage={fillPage} role="alert">
      <StateContent
        action={resolvedAction}
        contentClassName={contentClassName}
        description={description ?? stateMessages.error.description}
        icon={icon ?? stateMessages.error.icon ?? AlertCircle}
        iconClassName={iconClassName}
        iconWrapperClassName="bg-destructive/10 text-destructive"
        title={title ?? stateMessages.error.title}
      />
    </StateRoot>
  );
}

export interface StateLoadingProps {
  className?: string;
  fillPage?: boolean;
  message?: string;
}

function StateLoading({ className, fillPage = true, message }: StateLoadingProps) {
  return (
    <StateRoot ariaBusy ariaLive="polite" className={className} fillPage={fillPage} role="status">
      <div aria-label={message ?? "Loading"} className="flex size-full min-h-0 flex-col">
        <GenericPageSkeleton />
      </div>
    </StateRoot>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const State = Object.assign(StateRoot, {
  Empty: StateEmpty,
  Error: StateError,
  Loading: StateLoading,
});

// eslint-disable-next-line react-refresh/only-export-components
export { StateContent, StateEmpty, StateError, StateLoading, stateMessages, StateRoot };
export type { StateIcon, StateMessagePreset } from "@/components/state-messages";
