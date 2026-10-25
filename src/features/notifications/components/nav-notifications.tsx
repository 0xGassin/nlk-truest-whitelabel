"use client";

import { Bell, Inbox } from "lucide-react";

import {
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/features/settings";
import { getSidebarPopupClasses } from "@/features/sidebar/components/sidebar-popup";
import { cn } from "@/lib/utils";

const panelClassName = "rounded-lg border-[#eaeaea] bg-[#fdfdfd] dark:border-border dark:bg-card";

const panelBorderClassName = "bg-[#eaeaea] dark:bg-border";

const panelTitleClassName = "text-[15px] font-semibold tracking-[-0.3px] text-[#333] dark:text-foreground";

export function NotificationsMenu() {
  const { highContrastPopups } = useTheme();
  const popup = getSidebarPopupClasses(highContrastPopups);
  const highContrast = highContrastPopups !== "off";

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className={cn(
          "gap-2",
          highContrast
            ? "data-[state=open]:!bg-white/10 data-[state=open]:!text-white"
            : "data-[state=open]:bg-[#fafafa] data-[state=open]:text-[#333] dark:data-[state=open]:bg-white/5 dark:data-[state=open]:text-foreground",
          popup.item,
        )}
      >
        <Bell className="size-4" />
        <span>Notifications</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        className={cn("flex min-h-[24rem] w-96 flex-col rounded-lg p-0", highContrast ? popup.content : panelClassName)}
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className={cn(panelTitleClassName, highContrast && "text-white")}>Notifications</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={cn(highContrast ? popup.separator : panelBorderClassName)} />
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-2 px-3 text-center text-sm",
            highContrast ? "text-white/60" : "text-[#666] dark:text-muted-foreground",
          )}
        >
          <Inbox className="size-5 opacity-50" />
          You're all caught up
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
