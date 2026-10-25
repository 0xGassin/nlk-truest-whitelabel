"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface MessageContextValue {
  align: "end" | "start";
}

const MessageContext = React.createContext<MessageContextValue>({ align: "start" });

function useMessage() {
  return React.useContext(MessageContext);
}

function Message({
  align = "start",
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { align?: "end" | "start" }) {
  return (
    <MessageContext.Provider value={{ align }}>
      <div
        className={cn("flex gap-3", align === "end" && "flex-row-reverse", className)}
        data-slot="message"
        role="presentation"
        {...props}
      >
        {children}
      </div>
    </MessageContext.Provider>
  );
}

function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("shrink-0 self-end", className)} data-slot="message-avatar" {...props} />;
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  const { align } = useMessage();

  return (
    <div
      className={cn("flex min-w-0 max-w-[80%] flex-col gap-1", align === "end" && "items-end", className)}
      data-slot="message-content"
      {...props}
    />
  );
}

function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-2", className)} data-slot="message-header" {...props} />
  );
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}
      data-slot="message-footer"
      {...props}
    />
  );
}

export { Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader };
