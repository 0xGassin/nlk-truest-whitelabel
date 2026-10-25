"use client";

import type * as React from "react";

import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import styles from "./toast.module.css";

const toastManager = Toast.createToastManager();
const anchoredToastManager = Toast.createToastManager();

function ToastProvider({ children, ...props }: Toast.Provider.Props) {
  return (
    <Toast.Provider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </Toast.Provider>
  );
}

function ToastPortal({ ...props }: Toast.Portal.Props) {
  return <Toast.Portal {...props} />;
}

function ToastViewport({ className, ...props }: Toast.Viewport.Props) {
  return <Toast.Viewport className={cn(styles.viewport, className)} data-slot="toast-viewport" {...props} />;
}

function ToastRoot({ className, ...props }: Toast.Root.Props) {
  return <Toast.Root className={cn(styles.root, className)} data-slot="toast-root" {...props} />;
}

function ToastContent({ className, ...props }: Toast.Content.Props) {
  return <Toast.Content className={cn(styles.content, className)} {...props} />;
}

function ToastTitle({ className, ...props }: Toast.Title.Props) {
  return <Toast.Title className={cn(styles.title, className)} {...props} />;
}

function ToastDescription({ className, ...props }: Toast.Description.Props) {
  return <Toast.Description className={cn(styles.description, className)} data-slot="toast-description" {...props} />;
}

function ToastAction({ className, ...props }: Toast.Action.Props) {
  return <Toast.Action className={cn(styles.action, className)} data-slot="toast-action" {...props} />;
}

function ToastClose({
  className,
  render,
  ...props
}: {
  render?: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.ReactNode;
} & Toast.Close.Props) {
  return <Toast.Close className={cn(styles.close, className)} data-slot="toast-close" render={render} {...props} />;
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <ToastRoot key={toast.id} toast={toast}>
      <ToastContent>
        <div
          style={{
            alignItems: "start",
            display: "flex",
            gap: "0.5rem",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
              {(toast.data as ToastData | undefined)?.loading === true ? (
                <Spinner aria-hidden="true" className={styles.loadingIcon} />
              ) : null}
              <ToastTitle />
              {toast.type ? <span className={styles.statusPill} data-type={toast.type} /> : null}
            </div>
            <ToastDescription />
            {toast.actionProps ? (
              <ToastAction className={styles.actionButton}>{toast.actionProps.children}</ToastAction>
            ) : null}
          </div>
        </div>
        {(toast.data as ToastData | undefined)?.showCloseButton === true ? (
          <ToastClose
            render={(props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
              <button {...props} aria-label="Close">
                <X className="size-4" />
              </button>
            )}
          />
        ) : null}
      </ToastContent>
    </ToastRoot>
  ));
}

function AnchoredToasts() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className={styles.anchoredViewport}>
        {toasts.map((toast) => {
          const positionerProps = toast.positionerProps;

          if (!positionerProps?.anchor) {
            return null;
          }

          return (
            <Toast.Positioner
              className={styles.anchoredPositioner}
              key={toast.id}
              sideOffset={positionerProps.sideOffset ?? 4}
              toast={toast}
            >
              <Toast.Root className={styles.anchoredRoot} toast={toast}>
                <Toast.Content className={styles.anchoredContent}>
                  <Toast.Title className={styles.anchoredTitle} />
                </Toast.Content>
              </Toast.Root>
            </Toast.Positioner>
          );
        })}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

function AnchoredToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={anchoredToastManager}>
      {children}
      <AnchoredToasts />
    </Toast.Provider>
  );
}

interface ToastActionConfig {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  action?: ToastActionConfig;
  description?: string;
  duration?: number;
}

interface LoadingToastOptions extends ToastOptions {
  persist?: boolean;
}

interface ToastData {
  loading?: boolean;
  showCloseButton?: boolean;
}

interface PromiseMessages<T> {
  error: ((err: unknown) => string) | string;
  loading: string;
  success: ((data: T) => string) | string;
}

interface ToastFunction {
  (title: string, options?: ToastOptions): string;
  dismiss: (id: string) => void;
  error: (title: string, options?: ToastOptions) => string;
  info: (title: string, options?: ToastOptions) => string;
  loading: (title: string, options?: LoadingToastOptions) => string;
  promise: <T>(promise: Promise<T>, messages: PromiseMessages<T>) => Promise<T>;
  success: (title: string, options?: ToastOptions) => string;
  warning: (title: string, options?: ToastOptions) => string;
}

function createToastPayload(title: string, options?: ToastOptions, type?: string) {
  return {
    description: options?.description,
    timeout: options?.duration,
    title,
    ...(type && { type }),
    actionProps: options?.action
      ? {
          children: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  };
}

const toast = ((title: string, options?: ToastOptions) => {
  return toastManager.add(createToastPayload(title, options));
}) as ToastFunction;

toast.success = (title: string, options?: ToastOptions) => {
  return toastManager.add(createToastPayload(title, options, "success"));
};

toast.error = (title: string, options?: ToastOptions) => {
  return toastManager.add(createToastPayload(title, options, "error"));
};

toast.info = (title: string, options?: ToastOptions) => {
  return toastManager.add(createToastPayload(title, options, "info"));
};

toast.warning = (title: string, options?: ToastOptions) => {
  return toastManager.add(createToastPayload(title, options, "warning"));
};

toast.loading = (title: string, options?: LoadingToastOptions) => {
  const data: ToastData = {
    loading: true,
    ...(options?.persist ? { showCloseButton: true } : {}),
  };
  return toastManager.add<ToastData>({
    ...createToastPayload(
      title,
      {
        ...options,
        // `timeout: 0` disables auto-dismiss so the toast stays put until the
        // task finishes (dismissed via its id) or the user closes it manually.
        duration: options?.persist ? 0 : options?.duration,
      },
      "info",
    ),
    data,
  });
};

toast.dismiss = (id: string) => {
  toastManager.close(id);
};

toast.promise = <T,>(promise: Promise<T>, messages: PromiseMessages<T>): Promise<T> => {
  return toastManager.promise(promise, {
    error: messages.error,
    loading: messages.loading,
    success: messages.success,
  });
};

export { AnchoredToastProvider, toast, ToastProvider };
export type { ToastActionConfig as ToastAction, ToastOptions };
