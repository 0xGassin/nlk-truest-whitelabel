"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

const Drawer = ({
  direction = "right",
  handleOnly = true,
  shouldScaleBackground = false,
  ...props
}: {
  direction?: "bottom" | "left" | "right" | "top";
} & React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    direction={direction}
    handleOnly={handleOnly}
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

// eslint-disable-next-line @eslint-react/no-forward-ref
const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    className={cn("fixed inset-0 z-40 bg-[hsla(0,0%,97%,0.75)] dark:bg-black/60", className)}
    ref={ref}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

/** Uses the themed panel surface for detail drawers. */
const detailDrawerSurfaceClassName = "border-border bg-card";

// eslint-disable-next-line @eslint-react/no-forward-ref
const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Content>,
  {
    hideOverlay?: boolean;
    side?: "bottom" | "left" | "right" | "top";
  } & React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ children, className, hideOverlay = false, side = "right", ...props }, ref) => (
  <DrawerPortal>
    {hideOverlay ? null : <DrawerOverlay />}
    <DrawerPrimitive.Content
      className={cn(
        "fixed z-50 flex h-full flex-col border border-border bg-card",
        side === "right" && "inset-y-0 right-0 w-full max-w-[50%] rounded-l-lg",
        side === "left" && "inset-y-0 left-0 w-full max-w-[50%] rounded-r-lg",
        side === "top" && "inset-x-0 top-0 h-auto max-h-[50%] rounded-b-lg",
        side === "bottom" && "inset-x-0 bottom-0 h-auto max-h-[50%] rounded-t-lg",
        className,
      )}
      ref={ref}
      {...props}
    >
      {side === "right" ? (
        <div className="absolute top-1/2 left-0 h-16 w-1 -translate-y-1/2 rounded-r-full bg-muted/60" />
      ) : null}
      {side === "left" ? (
        <div className="absolute top-1/2 right-0 h-16 w-1 -translate-y-1/2 rounded-l-full bg-muted/60" />
      ) : null}
      {side === "bottom" ? <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" /> : null}
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

// eslint-disable-next-line @eslint-react/no-forward-ref
const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    className={cn("text-lg leading-none font-semibold tracking-tight", className)}
    ref={ref}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

// eslint-disable-next-line @eslint-react/no-forward-ref
const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description className={cn("text-sm text-muted-foreground", className)} ref={ref} {...props} />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  detailDrawerSurfaceClassName,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
